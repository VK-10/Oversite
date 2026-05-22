import asyncio
from django.views.decorators.cache import cache_page
from api.models import Scope
from api.models import Tag
import uuid
from api.serializers import ApiNewsSerializers
from django.shortcuts import render
from django.http import HttpResponse
from rest_framework.response import Response
from rest_framework.parsers import JSONParser 
from api.models import News
from api.utils import clean_post
from rest_framework.decorators import api_view
from api.utils import countries_map

import asyncio
import random

from django.http import StreamingHttpResponse

# Create your views here.


# @cache_page(60 * 10)
@api_view(['GET'])
def news(request):
        if request.method == 'GET':
            name = request.query_params.get('name')
            locality = ""
            usr_id = ""
            key = ""

            if name == 'indian-states':
                city_name = request.query_params.get('subname')
                locality = city_name
                user = Tag.objects.get(name = name)
                scope = Scope.objects.get(user_id = user.id, name = locality)
                post_list = News.objects.filter(feed_id = scope.id)

                posts = ApiNewsSerializers(post_list, many = True)
                key = ""
            elif name == 'world-countries':
                countries_name = request.query_params.get('subname')
                print("RAW SUBNAME:", repr(countries_name))
                locality = countries_name.rstrip('/')
                print("AFTER STRIP:", repr(locality))
                locality = countries_map(locality)
                print("AFTER MAP:", repr(locality))
                # countries_name = request.query_params.get('subname')
                # locality = countries_name.rstrip('/')
                # locality = countries_map(locality)
                user = Tag.objects.get(name = name)
                scope = Scope.objects.filter(user_id=user.id, name=locality).first()

                if not scope:
                    return Response(
                        {"error": f"Scope not found: {locality}"},
                        status=404
                    )

                post_list = News.objects.filter(feed_id = scope.id)

                posts = ApiNewsSerializers(post_list, many = True)
                key =""

            cleaned = [clean_post(p) for p in posts.data]
            # print(posts)
            return Response(cleaned)


async def sse_stream(request):
    """
        Sends server-sent events to the client
    """

    async def event_stream():
        tests = ["test-1","test-2","test-3","test-4","test-5",]
        i = 0
        while True:
            yield f'data: {tests[i % len(tests)]} {i}\n\n'
            i += 1
            await asyncio.sleep(1)

    return StreamingHttpResponse(event_stream(), content_type='text/event-stream')




@api_view(['GET'])
def health(request):
    if request.method == 'GET':
        return Response({
            "text": "alive"
})

