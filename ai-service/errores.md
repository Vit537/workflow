(venv) PS C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service> uvicorn main:app --host 0.0.0.0 --port 8001 --reload
INFO:     Will watch for changes in these directories: ['C:\\Users\\HP\\Desktop\\sw1-primer-parcial\\primer_parcial\\ai-service']
INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)
INFO:     Started reloader process [10152] using WatchFiles
Process SpawnProcess-1:
Traceback (most recent call last):
  File "C:\Python313\Lib\multiprocessing\process.py", line 313, in _bootstrap
    self.run()
    ~~~~~~~~^^
  File "C:\Python313\Lib\multiprocessing\process.py", line 108, in run
    self._target(*self._args, **self._kwargs)
    ~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\uvicorn\_subprocess.py", line 80, in subprocess_started
    target(sockets=sockets)
    ~~~~~~^^^^^^^^^^^^^^^^^
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\uvicorn\server.py", line 75, in run
    return asyncio_run(self.serve(sockets=sockets), loop_factory=self.config.get_loop_factory())
  File "C:\Python313\Lib\asyncio\runners.py", line 194, in run
    return runner.run(main)
           ~~~~~~~~~~^^^^^^
  File "C:\Python313\Lib\asyncio\runners.py", line 118, in run
    return self._loop.run_until_complete(task)
           ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^
  File "C:\Python313\Lib\asyncio\base_events.py", line 720, in run_until_complete
    return future.result()
           ~~~~~~~~~~~~~^^
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\uvicorn\server.py", line 79, in serve
    await self._serve(sockets)
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\uvicorn\server.py", line 86, in _serve
    config.load()
    ~~~~~~~~~~~^^
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\uvicorn\config.py", line 441, in load
    self.loaded_app = import_from_string(self.app)
                      ~~~~~~~~~~~~~~~~~~^^^^^^^^^^
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\uvicorn\importer.py", line 22, in import_from_string
    raise exc from None
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\uvicorn\importer.py", line 19, in import_from_string
    module = importlib.import_module(module_str)
  File "C:\Python313\Lib\importlib\__init__.py", line 88, in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "<frozen importlib._bootstrap>", line 1387, in _gcd_import
  File "<frozen importlib._bootstrap>", line 1360, in _find_and_load
  File "<frozen importlib._bootstrap>", line 1331, in _find_and_load_unlocked
  File "<frozen importlib._bootstrap>", line 935, in _load_unlocked
  File "<frozen importlib._bootstrap_external>", line 1026, in exec_module
  File "<frozen importlib._bootstrap>", line 488, in _call_with_frames_removed
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\main.py", line 11, in <module>
    from langchain.prompts import ChatPromptTemplate
ModuleNotFoundError: No module named 'langchain.prompts'