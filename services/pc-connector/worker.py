"""Outbound-only MT5 history worker. There are deliberately no order/trading methods."""
import base64
import ctypes
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding


class ConnectorError(Exception):
    pass


def unprotect(blob):
    if os.name != 'nt':
        raise ConnectorError('WINDOWS_REQUIRED')
    from ctypes import wintypes

    class DataBlob(ctypes.Structure):
        _fields_ = [('size', wintypes.DWORD), ('data', ctypes.POINTER(ctypes.c_ubyte))]

    buffer = ctypes.create_string_buffer(blob)
    source = DataBlob(len(blob), ctypes.cast(buffer, ctypes.POINTER(ctypes.c_ubyte)))
    target = DataBlob()
    if not ctypes.windll.crypt32.CryptUnprotectData(ctypes.byref(source), None, None, None, None, 0, ctypes.byref(target)):
        raise ConnectorError('WINDOWS_IDENTITY_REQUIRED')
    try:
        return ctypes.string_at(target.data, target.size)
    finally:
        ctypes.windll.kernel32.LocalFree(target.data)


def decrypt_password(private_key, job):
    if not job.get('ciphertext'):
        raise ConnectorError('NEEDS_PASSWORD')
    if datetime.fromisoformat(job['secretExpiresAt'].replace('Z', '+00:00')) <= datetime.now(timezone.utc):
        raise ConnectorError('NEEDS_PASSWORD')
    try:
        value = private_key.decrypt(base64.b64decode(job['ciphertext'], validate=True), padding.OAEP(mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=job['context'].encode('utf-8'))).decode('utf-8')
        if not value or len(value.encode('utf-8')) > 256 or '\x00' in value:
            raise ValueError()
        return value
    except Exception:
        raise ConnectorError('NEEDS_PASSWORD') from None


def account_identity(mt5, job):
    terminal, account = mt5.terminal_info(), mt5.account_info()
    if terminal is None or not terminal.connected or account is None:
        raise ConnectorError('DISCONNECTED')
    if str(account.login) != job['login'] or account.server != job['server']:
        raise ConnectorError('LOGIN_FAILED')
    # A false flag can also mean a broker-disabled account; it does not prove password type.
    # Read-only code plus a check before AND after each history read remains mandatory.
    if account.trade_allowed is not False:
        raise ConnectorError('INVESTOR_REQUIRED')
    account_type = {0: 'DEMO', 1: 'CONTEST', 2: 'REAL'}.get(account.trade_mode)
    if account_type is None or not re.fullmatch(r'[A-Z]{3}', account.currency):
        raise ConnectorError('HISTORY_FAILED')
    if account_type != 'DEMO' and not job.get('allowReal', False):
        raise ConnectorError('DEMO_REQUIRED')
    return account, account_type


def decimal(value):
    result = Decimal(str(value))
    if not result.is_finite() or abs(result) >= Decimal('1000000000000000'):
        raise ConnectorError('HISTORY_FAILED')
    return format(result.quantize(Decimal('.00000001')), 'f')


def read_history(mt5, job, password, terminal_path):
    try:
        if not password:
            raise ConnectorError('LOGIN_FAILED')
        if not mt5.initialize(str(terminal_path), timeout=30000, portable=True):
            raise ConnectorError('INVALID_TERMINAL')
        def isolated():
            info=mt5.terminal_info()
            if info is None or Path(info.path).resolve()!=Path(terminal_path).resolve().parent or Path(info.data_path).resolve()!=Path(terminal_path).resolve().parent:
                raise ConnectorError('INVALID_TERMINAL')
        # Verify IPC isolation BEFORE login can change any account session.
        isolated()
        if not mt5.login(int(job['login']),password=password,server=job['server'],timeout=30000):
            raise ConnectorError('LOGIN_FAILED')
        account, account_type = account_identity(mt5, job)
        start, end = [datetime.fromisoformat(job[key].replace('Z', '+00:00')) for key in ['from', 'to']]
        if start >= end or (end-start).days > 367:
            raise ConnectorError('HISTORY_FAILED')
        history = mt5.history_deals_get(start, end)
        if history is None or len(history) > 10000:
            raise ConnectorError('HISTORY_FAILED')
        deals = []
        for item in history:
            if item.type not in (0, 1):
                continue
            stamp = datetime.fromtimestamp(item.time_msc / 1000, timezone.utc)
            if not start <= stamp < end:
                continue
            deals.append(dict(id=str(item.ticket), time=stamp.isoformat(timespec='milliseconds').replace('+00:00', 'Z'), type='DEAL_TYPE_BUY' if item.type == 0 else 'DEAL_TYPE_SELL', positionId=str(item.position_id), entryType={0:'DEAL_ENTRY_IN',1:'DEAL_ENTRY_OUT',2:'DEAL_ENTRY_INOUT',3:'DEAL_ENTRY_OUT_BY'}.get(item.entry,''), symbol=str(item.symbol)[:40], volume=decimal(item.volume), profit=decimal(item.profit), commission=decimal(item.commission), swap=decimal(item.swap), fee=decimal(getattr(item, 'fee', 0))))
        isolated()
        after, after_type = account_identity(mt5, job)
        if after.currency != account.currency or after_type != account_type:
            raise ConnectorError('HISTORY_FAILED')
        return dict(login=job['login'], server=job['server'], tradeAllowed=False, currency=account.currency, accountType=account_type, deals=deals, **{'from':job['from'],'to':job['to']})
    except ConnectorError:
        raise
    except Exception:
        raise ConnectorError('HISTORY_FAILED') from None
    finally:
        mt5.shutdown()


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ConnectorError('NETWORK_UNAVAILABLE')


class Api:
    def __init__(self, origin, token):
        parsed = urllib.parse.urlparse(origin)
        if parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in ('', '/') or parsed.scheme != 'https' and not (parsed.scheme == 'http' and parsed.hostname in ('127.0.0.1','localhost','::1')):
            raise ConnectorError('HTTPS_REQUIRED')
        self.origin, self.token = origin.rstrip('/'), token
        self.client = urllib.request.build_opener(NoRedirect())

    def post(self, path, data):
        body = json.dumps(data, separators=(',', ':')).encode('utf-8')
        if len(body) > 4*1024*1024:
            raise ConnectorError('HISTORY_FAILED')
        req = urllib.request.Request(self.origin+path, data=body, headers={'Authorization':'Bearer '+self.token,'Content-Type':'application/json','Accept':'application/json'}, method='POST')
        try:
            with self.client.open(req, timeout=30) as response:
                content = response.read(1024*1024+1)
                if len(content)>1024*1024:
                    raise ConnectorError('NETWORK_UNAVAILABLE')
                return json.loads(content)
        except urllib.error.HTTPError as error:
            if error.code in (401,403):
                raise ConnectorError('WORKER_REVOKED') from None
            raise ConnectorError('NETWORK_UNAVAILABLE') from None
        except ConnectorError:
            raise
        except Exception:
            raise ConnectorError('NETWORK_UNAVAILABLE') from None


class Terminals:
    def __init__(self, root, source):
        self.root, self.source, self.processes = Path(root).resolve(), Path(source).resolve(), {}
        if self.source.name.lower() != 'terminal64.exe' or not self.source.is_file():
            raise ConnectorError('INVALID_TERMINAL')
        self.root.mkdir(parents=True, exist_ok=True)

    def path(self, account_id):
        if not re.fullmatch(r'[a-zA-Z0-9_-]{1,80}', account_id):
            raise ConnectorError('INVALID_TERMINAL')
        folder = (self.root/account_id).resolve()
        if not folder.is_relative_to(self.root) or folder == self.root:
            raise ConnectorError('INVALID_TERMINAL')
        folder.mkdir(exist_ok=True)
        target = folder/'terminal64.exe'
        if target == self.source:
            raise ConnectorError('INVALID_TERMINAL')
        if not target.exists():
            shutil.copy2(self.source, target)
            (folder/'Config').mkdir(exist_ok=True)
            # Broker server directory and license only; never copy accounts, profiles or EAs.
            for name in ('servers.dat','terminal.lic'):
                seed=self.source.parent/'Config'/name
                if seed.is_file():
                    shutil.copy2(seed, folder/'Config'/name)
        if account_id not in self.processes or self.processes[account_id].poll() is not None:
            startup=subprocess.STARTUPINFO()
            startup.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            startup.wShowWindow=0
            self.processes[account_id]=subprocess.Popen([str(target),'/portable'],cwd=folder,startupinfo=startup,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        return target

    def revoke(self, account_id):
        process=self.processes.pop(account_id,None)
        if process is not None and process.poll() is None:
            process.terminate()
            try: process.wait(timeout=10)
            except subprocess.TimeoutExpired: pass

    def close(self):
        for account_id in list(self.processes): self.revoke(account_id)


def run_cycle(api, private_key, mt5, terminals, credentials):
    poll=api.post('/api/pc-worker/poll', {})
    grants={row['id']:row['generation'] for row in poll['grants']}
    for account_id in list(credentials):
        if grants.get(account_id)!=credentials[account_id][0]:
            credentials.pop(account_id,None);terminals.revoke(account_id)
    delivery_errors={}
    # Accept all encrypted deliveries promptly, before potentially slow terminal startup.
    for item in poll['jobs']:
        if item.get('ciphertext') and grants.get(item['id'])==item['generation']:
            try: credentials[item['id']]=(item['generation'],decrypt_password(private_key,item))
            except ConnectorError: delivery_errors[item['id']]='NEEDS_PASSWORD'
    for job in poll['jobs']:
        if grants.get(job['id'])!=job['generation']:
            continue
        receipt={key:job[key] for key in ('id','generation','lease')}
        api.post('/api/pc-worker/check',receipt)
        try:
            if job['id'] in delivery_errors:
                raise ConnectorError(delivery_errors[job['id']])
            saved=credentials.get(job['id'])
            if not saved or saved[0]!=job['generation']:
                raise ConnectorError('NEEDS_PASSWORD')
            receipt.update(read_history(mt5,job,saved[1],terminals.path(job['id'])))
        except ConnectorError as error:
            code=str(error)
            if code not in ('INVESTOR_REQUIRED','LOGIN_FAILED','HISTORY_FAILED','NEEDS_PASSWORD','DISCONNECTED','INVALID_TERMINAL','DEMO_REQUIRED'):
                code='UNKNOWN'
            receipt['error']=code
            if code not in ('DISCONNECTED','HISTORY_FAILED'):
                credentials.pop(job['id'],None);terminals.revoke(job['id'])
        except Exception:
            receipt['error']='UNKNOWN';credentials.pop(job['id'],None);terminals.revoke(job['id'])
        api.post('/api/pc-worker/receipt',receipt)
    return 30


def main():
    if os.name!='nt': raise ConnectorError('WINDOWS_REQUIRED')
    import msvcrt
    import MetaTrader5 as mt5
    root=Path(__file__).resolve().parents[2]/'.private-pc-connector'
    with (root/'worker.lock').open('a+b') as lock:
        lock.seek(0);lock.write(b'1');lock.flush();lock.seek(0)
        try: msvcrt.locking(lock.fileno(),msvcrt.LK_NBLCK,1)
        except OSError: raise ConnectorError('ALREADY_RUNNING') from None
        config=json.loads(unprotect(base64.b64decode((root/'worker.dpapi').read_text('utf-8').strip())))
        private_key=serialization.load_pem_private_key(config['privateKey'].encode(),password=None)
        api=Api(config['origin'],config['token']);terminals=Terminals(root/'terminals',config['terminalPath']);credentials={}
        print('Read-only PC connector started. Waiting for account consent.',flush=True)
        try:
            while not (root/'stop.request').exists():
                try: run_cycle(api,private_key,mt5,terminals,credentials)
                except ConnectorError as error:
                    if str(error)=='WORKER_REVOKED': break
                    print('Connector could not refresh. Retrying; saved website results may be stale.',flush=True)
                for _ in range(30):
                    if (root/'stop.request').exists(): break
                    time.sleep(1)
        finally:
            credentials.clear();terminals.close();mt5.shutdown()


if __name__=='__main__':
    try: main()
    except KeyboardInterrupt: pass
    except Exception:
        print('Connector stopped. Check private setup, Python dependencies and dedicated terminal path.',flush=True)
        sys.exit(1)
