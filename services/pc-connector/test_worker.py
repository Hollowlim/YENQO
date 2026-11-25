import base64
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace as N
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from worker import decrypt_password, read_history, run_cycle, Api, Terminals, ConnectorError


class FakeMt5:
    def __init__(self, wrong_path=False, **changes):
        self.info=N(login=123456,server='Synthetic-Demo',trade_allowed=False,currency='USD',trade_mode=0)
        for key,value in changes.items(): setattr(self.info,key,value)
        self.history_calls=0
        self.stopped=0
        self.wrong_path=wrong_path
        self.logins=0
    def initialize(self,*args,**kwargs):
        assert 'password' not in kwargs and kwargs['portable'] is True
        self.folder=Path(args[0]).resolve().parent
        return True
    def login(self,login,**kwargs):
        assert kwargs['password']=='synthetic-investor' and login==123456
        self.logins+=1
        return True
    def terminal_info(self): return N(connected=True,path=str(Path('other-terminal').resolve() if self.wrong_path else self.folder),data_path=str(self.folder))
    def account_info(self): return self.info
    def history_deals_get(self,*args):
        self.history_calls+=1
        return [N(ticket=1,time_msc=1793452800123,type=0,entry=0,position_id=9,symbol='XAUUSD',volume=.1,profit=0,commission=-1,swap=0,fee=0),N(ticket=2,time_msc=1793452860123,type=1,entry=1,position_id=9,symbol='XAUUSD',volume=.1,profit=11,commission=-1,swap=0,fee=0),N(type=2)]
    def shutdown(self): self.stopped+=1
    def order_send(self,*args): raise AssertionError('Trading is forbidden')


def job():
    return dict(id='synthetic-account',generation=1,lease='synthetic-lease',login='123456',server='Synthetic-Demo',context='bound-account-context',secretExpiresAt=(datetime.now(timezone.utc)+timedelta(minutes=2)).isoformat(),allowReal=False,**{'from':'2026-10-31T00:00:00.000Z','to':'2026-11-01T00:00:00.000Z'})


class Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls): cls.key=rsa.generate_private_key(public_exponent=65537,key_size=4096)
    def encrypted(self, data):
        value=self.key.public_key().encrypt(b'synthetic-investor',padding.OAEP(mgf=padding.MGF1(hashes.SHA256()),algorithm=hashes.SHA256(),label=data['context'].encode()))
        return base64.b64encode(value).decode()
    def test_context_encryption_and_expiry(self):
        data=job();data['ciphertext']=self.encrypted(data)
        self.assertEqual(decrypt_password(self.key,data),'synthetic-investor')
        data['context']='other-owner-context'
        with self.assertRaises(ConnectorError): decrypt_password(self.key,data)
        data['context']='bound-account-context';data['secretExpiresAt']='2020-01-01T00:00:00Z'
        with self.assertRaises(ConnectorError): decrypt_password(self.key,data)
    def test_trade_enabled_and_wrong_identity_rejected_before_history(self):
        for values in [dict(trade_allowed=True),dict(login=987654),dict(server='Other-Demo'),dict(trade_mode=2)]:
            mt5=FakeMt5(**values)
            with self.assertRaises(ConnectorError): read_history(mt5,job(),'synthetic-investor',Path('isolated/terminal64.exe'))
            self.assertEqual(mt5.history_calls,0);self.assertEqual(mt5.stopped,1)
    def test_history_is_decimal_utc_and_excludes_balance_without_order_calls(self):
        mt5=FakeMt5();result=read_history(mt5,job(),'synthetic-investor',Path('isolated/terminal64.exe'))
        self.assertEqual(len(result['deals']),2);self.assertEqual(result['deals'][1]['profit'],'11.00000000');self.assertEqual(result['deals'][0]['positionId'],'9');self.assertFalse(result['tradeAllowed']);self.assertEqual(result['accountType'],'DEMO')
    def test_shared_or_unexpected_terminal_is_rejected_before_login(self):
        mt5=FakeMt5(wrong_path=True)
        with self.assertRaises(ConnectorError): read_history(mt5,job(),'synthetic-investor',Path('isolated/terminal64.exe'))
        self.assertEqual(mt5.logins,0);self.assertEqual(mt5.history_calls,0)
    def test_missing_credentials_after_restart_and_revoked_cache(self):
        data=job();calls=[]
        class FakeApi:
            def post(self,path,body):
                calls.append((path,body))
                return dict(grants=[dict(id=data['id'],generation=1)],jobs=[data]) if path.endswith('poll') else dict(accepted=True)
        class FakeTerminals:
            def path(self,key): raise AssertionError('No credential: no terminal login')
            def revoke(self,key): calls.append(('revoked',key))
        cache={'old-account':(1,'synthetic-other-password')};run_cycle(FakeApi(),self.key,FakeMt5(),FakeTerminals(),cache)
        self.assertNotIn('old-account',cache);self.assertEqual(calls[-1][1]['error'],'NEEDS_PASSWORD')
    def test_network_targets_require_https_and_no_embedded_credentials(self):
        for url in ['http://example.test','https://user:pass@example.test','https://example.test/path','https://example.test?x=1']:
            with self.assertRaises(ConnectorError): Api(url,'synthetic-token')
        Api('http://127.0.0.1:3000','synthetic-token')
    def test_terminal_paths_cannot_escape_dedicated_root(self):
        with TemporaryDirectory() as folder:
            source=Path(folder)/'source'/'terminal64.exe';source.parent.mkdir();source.write_bytes(b'synthetic test binary, never launched')
            terminals=Terminals(Path(folder)/'isolated',source)
            for key in ['../outside','C:\\Windows','a/b','']:
                with self.assertRaises(ConnectorError): terminals.path(key)


if __name__=='__main__': unittest.main()
