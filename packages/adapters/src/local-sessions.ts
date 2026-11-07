import { createHash, randomBytes } from 'node:crypto';
import type { Pool } from 'pg';
import { z } from 'zod';
import { DomainError } from '@kyb/domain';
import { LOCAL_ACCOUNTS } from './database.js';

const Account=z.enum(['alice','bob']);
const Session=z.object({user_id:z.uuid(),account:Account}).strict();
export interface FixtureSessions {
  create(account:'alice'|'bob'):Promise<{token:string;account:'alice'|'bob';workspaceId:string}>;
  resolve(token:string):Promise<{userId:string;workspaceId:string;account:'alice'|'bob'}|null>;
  revoke(token:string):Promise<void>;
}
const digest=(token:string)=>createHash('sha256').update(token).digest('hex');
export class PostgresFixtureSessions implements FixtureSessions {
  constructor(private readonly pool:Pool){}
  async create(input:'alice'|'bob') {
    const account=Account.parse(input);
    const client=await this.pool.connect();
    try {
      await client.query('begin');
      await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))",[`session:${account}`]);
      await client.query('delete from local_fixture.sessions where account=$1 and expires_at<now()',[account]);
      const count=z.object({n:z.number()}).parse((await client.query('select count(*)::int as n from local_fixture.sessions where account=$1',[account])).rows[0]);
      if(count.n>=20)throw new DomainError('session_limit',429);
      const token=randomBytes(32).toString('hex');
      await client.query("insert into local_fixture.sessions(token_hash,user_id,account,expires_at) values($1,$2,$3,now()+interval '1 hour')",[digest(token),LOCAL_ACCOUNTS[account].userId,account]);
      await client.query('commit');
      return {token,account,workspaceId:LOCAL_ACCOUNTS[account].workspaceId};
    } catch(error){await client.query('rollback');throw error;} finally{client.release();}
  }
  async resolve(token:string) {
    if(!/^[a-f0-9]{64}$/.test(token))return null;
    const row=(await this.pool.query('select user_id,account from local_fixture.sessions where token_hash=$1 and expires_at>now()',[digest(token)])).rows[0];
    if(!row)return null;
    const session=Session.parse(row),actor=LOCAL_ACCOUNTS[session.account];
    if(session.user_id!==actor.userId)return null;
    return {...actor,account:session.account};
  }
  async revoke(token:string){await this.pool.query('delete from local_fixture.sessions where token_hash=$1',[digest(token)]);}
}
