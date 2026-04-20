(venv) PS C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service> uvicorn main:app --host 0.0.0.0 --port 8001 --reload
INFO:     Will watch for changes in these directories: ['C:\\Users\\HP\\Desktop\\sw1-primer-parcial\\primer_parcial\\ai-service']
INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)
INFO:     Started reloader process [20488] using WatchFiles
INFO:     Started server process [10548]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     127.0.0.1:62304 - "POST /api/ia/generar-diagrama HTTP/1.1" 500 Internal Server Error
ERROR:    Exception in ASGI application
Traceback (most recent call last):
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\main.py", line 145, in generar_diagrama
    resultado = await chain.ainvoke({"prompt": solicitud.prompt})
                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\langchain_core\runnables\base.py", line 3197, in ainvoke
    input_ = await coro_with_context(part(), context, create_task=True)
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\langchain_core\language_models\chat_models.py", line 477, in ainvoke
    llm_result = await self.agenerate_prompt(
                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    ...<8 lines>...
    )
    ^
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\langchain_core\language_models\chat_models.py", line 1196, in agenerate_prompt
    return await self.agenerate(
           ^^^^^^^^^^^^^^^^^^^^^
        prompt_messages, stop=stop, callbacks=callbacks, **kwargs
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\langchain_core\language_models\chat_models.py", line 1154, in agenerate
    raise exceptions[0]
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\langchain_core\language_models\chat_models.py", line 1423, in _agenerate_with_cache
    result = await self._agenerate(
             ^^^^^^^^^^^^^^^^^^^^^^
        messages, stop=stop, run_manager=run_manager, **kwargs
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\langchain_groq\chat_models.py", line 642, in _agenerate
    response = await self.async_client.create(messages=message_dicts, **params)
               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\groq\resources\chat\completions.py", line 941, in create
    return await self._post(
           ^^^^^^^^^^^^^^^^^
    ...<47 lines>...
    )
    ^
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\groq\_base_client.py", line 1762, in post
    return await self.request(cast_to, opts, stream=stream, stream_cls=stream_cls)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\groq\_base_client.py", line 1576, in request
    raise self._make_status_error_from_response(err.response) from None
groq.BadRequestError: Error code: 400 - {'error': {'message': 'The model `llama3-8b-8192` has been decommissioned and is no longer supported. Please refer to https://console.groq.com/docs/deprecations for a recommendation on which model to use instead.', 'type': 'invalid_request_error', 'code': 'model_decommissioned'}}

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\uvicorn\protocols\http\httptools_impl.py", line 420, in run_asgi
    result = await app(  # type: ignore[func-returns-value]
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        self.scope, self.receive, self.send
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\uvicorn\middleware\proxy_headers.py", line 60, in __call__
    return await self.app(scope, receive, send)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\fastapi\applications.py", line 1163, in __call__
    await super().__call__(scope, receive, send)
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\starlette\applications.py", line 90, in __call__
    await self.middleware_stack(scope, receive, send)
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\starlette\middleware\errors.py", line 186, in __call__
    raise exc
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\starlette\middleware\errors.py", line 164, in __call__
    await self.app(scope, receive, _send)
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\starlette\middleware\cors.py", line 88, in __call__
    await self.app(scope, receive, send)
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\starlette\middleware\exceptions.py", line 63, in __call__
    await wrap_app_handling_exceptions(self.app, conn)(scope, receive, send)
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\starlette\_exception_handler.py", line 53, in wrapped_app
    raise exc
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\starlette\_exception_handler.py", line 42, in wrapped_app
    await app(scope, receive, sender)
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\fastapi\middleware\asyncexitstack.py", line 18, in __call__
    await self.app(scope, receive, send)
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\starlette\routing.py", line 660, in __call__
    await self.middleware_stack(scope, receive, send)
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\starlette\routing.py", line 680, in app
    await route.handle(scope, receive, send)
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\starlette\routing.py", line 276, in handle
    await self.app(scope, receive, send)
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\fastapi\routing.py", line 134, in app
    await wrap_app_handling_exceptions(app, request)(scope, receive, send)
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\starlette\_exception_handler.py", line 53, in wrapped_app
    raise exc
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\starlette\_exception_handler.py", line 42, in wrapped_app
    await app(scope, receive, sender)
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\fastapi\routing.py", line 120, in app
    response = await f(request)
               ^^^^^^^^^^^^^^^^
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\fastapi\routing.py", line 674, in app
    raw_response = await run_endpoint_function(
                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    ...<3 lines>...
    )
    ^
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\venv\Lib\site-packages\fastapi\routing.py", line 328, in run_endpoint_function
    return await dependant.call(**values)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\HP\Desktop\sw1-primer-parcial\primer_parcial\ai-service\main.py", line 159, in generar_diagrama
    except json.JSONDecodeError as exc:
           ^^^^
UnboundLocalError: cannot access local variable 'json' where it is not associated with a value
