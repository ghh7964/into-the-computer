(function(){let e=`314.0.7`,t=`https://cdn.jsdelivr.net/pyodide/v${e}/full/`,n=self,r=e=>n.postMessage(e),i=String.raw`
import sys, json, math, traceback

__judge_FILE = '<student>'

class __judge_Out:
    def __init__(self, limit):
        self.parts = []
        self.size = 0
        self.limit = limit
        self.cut = False
    def write(self, s):
        s = str(s)
        if self.size < self.limit:
            take = s[: self.limit - self.size]
            self.parts.append(take)
            self.size += len(take)
            if len(take) < len(s):
                self.cut = True
        elif s:
            self.cut = True
        return len(s)
    def flush(self):
        pass
    def text(self):
        t = ''.join(self.parts)
        if self.cut:
            t += '\n… (출력이 너무 길어서 뒷부분은 줄였어요)'
        return t

def __judge_value(v, depth=0):
    if v is None:
        return {'t': 'none'}
    if isinstance(v, bool):
        return {'t': 'bool', 'v': v}
    if isinstance(v, int):
        if abs(v) < 2 ** 53:
            return {'t': 'int', 'v': v}
        return {'t': 'other', 'type': '아주 큰 정수'}
    if isinstance(v, float):
        return {'t': 'float', 'v': v if math.isfinite(v) else 0}
    if isinstance(v, str):
        return {'t': 'str', 'v': v[:200]}
    if isinstance(v, (tuple, list)) and depth < 3:
        items = [__judge_value(x, depth + 1) for x in list(v)[:20]]
        return {'t': 'tuple' if isinstance(v, tuple) else 'list', 'items': items}
    return {'t': 'other', 'type': type(v).__name__}

def __judge_line(exc):
    line = None
    for fr in traceback.extract_tb(exc.__traceback__):
        if fr.filename == __judge_FILE:
            line = fr.lineno
    return line

def __judge_fail(phase, exc, out):
    return json.dumps({'ok': False, 'phase': phase, 'errorType': type(exc).__name__,
                       'message': str(exc)[:300], 'line': __judge_line(exc), 'stdout': out.text()})

def __judge_run(code, fn_name, args_json):
    out = __judge_Out(4000)
    old_out = sys.stdout
    sys.stdout = out
    try:
        try:
            compiled = compile(code, __judge_FILE, 'exec')
        except SyntaxError as e:
            return json.dumps({'ok': False, 'phase': 'syntax', 'errorType': type(e).__name__,
                               'message': str(e.msg)[:300], 'line': e.lineno, 'stdout': out.text()})
        ns = {'__name__': '__main__'}
        try:
            exec(compiled, ns)
        except BaseException as e:
            return __judge_fail('define', e, out)
        fn = ns.get(fn_name)
        if not callable(fn):
            return json.dumps({'ok': False, 'phase': 'missing', 'errorType': 'NameError',
                               'message': "name '%s' is not defined" % fn_name, 'line': None, 'stdout': out.text()})
        try:
            value = fn(*json.loads(args_json))
        except BaseException as e:
            return __judge_fail('call', e, out)
        try:
            r = repr(value)
        except BaseException:
            r = '?'
        return json.dumps({'ok': True, 'value': __judge_value(value), 'repr': r[:300], 'stdout': out.text()})
    finally:
        sys.stdout = old_out

class __judge_Stop(BaseException):
    pass

def __judge_num(v):
    if isinstance(v, int) and not isinstance(v, bool) and abs(v) < 2 ** 53:
        return v
    return None

def __judge_trace(code, fn_name, args_json, limit):
    # mid를 고르는 줄(mid = …)이 끝날 때마다 low, high, mid, data[mid]를 적는다. limit번 적으면 함수를 멈춘다.
    import re
    mid_lines = {i + 1 for i, l in enumerate(code.split('\n')) if re.match(r'\s*mid\s*=(?!=)', l)}
    rows = []
    out = __judge_Out(0)
    old_out = sys.stdout
    sys.stdout = out
    try:
        try:
            compiled = compile(code, __judge_FILE, 'exec')
            ns = {'__name__': '__main__'}
            exec(compiled, ns)
        except BaseException:
            return json.dumps({'ok': False})
        fn = ns.get(fn_name)
        target_code = getattr(fn, '__code__', None)
        if target_code is None:
            return json.dumps({'ok': False})
        state = {'prev': None}
        def local_trace(frame, event, arg):
            if event == 'line':
                if state['prev'] in mid_lines:
                    loc = frame.f_locals
                    mid = __judge_num(loc.get('mid'))
                    value = None
                    try:
                        if mid is not None:
                            value = __judge_num(loc.get('data')[mid])
                    except BaseException:
                        value = None
                    rows.append({'low': __judge_num(loc.get('low')), 'high': __judge_num(loc.get('high')), 'mid': mid, 'value': value})
                    if len(rows) >= limit:
                        raise __judge_Stop()
                state['prev'] = frame.f_lineno
            return local_trace
        def global_trace(frame, event, arg):
            if event == 'call' and frame.f_code is target_code:
                return local_trace
            return None
        stopped = False
        sys.settrace(global_trace)
        try:
            fn(*json.loads(args_json))
        except __judge_Stop:
            stopped = True
        except BaseException:
            pass
        finally:
            sys.settrace(None)
        return json.dumps({'ok': True, 'rows': rows, 'stopped': stopped})
    finally:
        sys.stdout = old_out
`,a=null,o=null,s=null;async function c(){try{let n=await(await import(
/* @vite-ignore */
`${t}pyodide.mjs`)).loadPyodide({indexURL:t});n.setStdin({error:!0}),n.setStdout({batched:()=>{}}),n.setStderr({batched:()=>{}}),n.runPython(i),o=n.globals.get(`__judge_run`),s=n.globals.get(`__judge_trace`),a=n,r({type:`ready`,version:n.version??e})}catch(e){r({type:`load-error`,message:e instanceof Error?e.message:String(e)})}}n.addEventListener(`message`,e=>{let t=e.data;if(t.type===`run`){if(!a||!o||!s)r({type:`result`,id:t.id,json:null,message:`파이썬이 아직 준비되지 않았어요.`});else try{let e=JSON.stringify(t.args),n=t.mode===`trace`?s(t.code,t.fn,e,t.limit??8):o(t.code,t.fn,e);r({type:`result`,id:t.id,json:String(n)})}catch(e){r({type:`result`,id:t.id,json:null,message:e instanceof Error?e.message:String(e)})}}}),c()})();