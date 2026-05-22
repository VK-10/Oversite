from markdown_it.rules_block import reference
from importlib.metadata import version
from search_agents.pipeline_stream import app
from django.shortcuts import render
import asyncio
from rest_framework.decorators import api_view
from django.http import StreamingHttpResponse
from search_agents.serializers import QuerySerializer
import json
from rest_framework.views import APIView
from django.views.decorators.csrf import csrf_exempt


# Create your views here.
# @api_view(["POST"])
@csrf_exempt
async def helper(request):
    """
        Sends server-sent events to the client in form of chunks
    """
    if request.method == 'POST':
        data = json.loads(request.body)
        print("DATA:" , data)
        serializer = QuerySerializer(data = data)

        serializer.is_valid(raise_exception=True)

        async def event_stream():
            stream = app.astream_events(data, stream_mode=["messages", "updates"],version = "v2")

            async for event in stream:
                # print(event)
                event_type = event.get("event")
                if event_type == "on_chat_model_stream":

                    chunk = (
                        event
                        .get("data", {})
                        .get("chunk")
                    )

                    text = getattr(chunk, "content", "")

                    if text:
                        payload = {
                            "type": "token",
                            "content": text,
                        }


                    yield f"data: {json.dumps(payload)}\n\n"

                
            yield f"data: {json.dumps({'done': True})}\n\n"

                      
    return StreamingHttpResponse(event_stream(), content_type='text/event-stream')


    # async def event_stream():
    #     tests = ["test-1","test-2","test-3","test-4","test-5",]
    #     i = 0
    #     while True:
    #         yield f'data: {tests[i % len(tests)]} {i}\n\n'
    #         i += 1
    #         await asyncio.sleep(1)

    # for message in stream.messages:
    #                 for token in message.text:
    #                     print(token, end="", flush=True)
    #                     yield f'message: {token} \n\n'

