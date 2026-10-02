import {loadPyodide} from 'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/pyodide.mjs';
self.onmessage=async(event)=>{let output='';try{const py=await loadPyodide({stdout:s=>{if(output.length<20000)output+=s+'\n'},stderr:s=>{if(output.length<20000)output+=s+'\n'},stdin:()=>undefined});self.postMessage({ready:true});await py.runPythonAsync(event.data.code);let tests=null;if(event.data.tests){py.globals.set('__ct_test_data',JSON.stringify(event.data.tests));const result=await py.runPythonAsync(`
import json as __ct_json
import copy as __ct_copy
__ct_results = []
for __ct_case in __ct_json.loads(__ct_test_data):
    try:
        __ct_actual = solve(*__ct_copy.deepcopy(__ct_case['args']))
        __ct_results.append({'passed': __ct_actual == __ct_case['expected'], 'actual': __ct_actual, 'expected': __ct_case['expected']})
    except Exception as __ct_error:
        __ct_results.append({'passed': False, 'error': type(__ct_error).__name__ + ': ' + str(__ct_error)})
__ct_json.dumps(__ct_results, default=repr)
`);tests=JSON.parse(result)}self.postMessage({output,tests})}catch(e){self.postMessage({output,error:String(e)})}};
