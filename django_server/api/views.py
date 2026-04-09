from api.models import Scope
from api.models import Tag
import uuid
from api.serializers import ApiNewsSerializers
from django.shortcuts import render
from django.http import HttpResponse
from rest_framework.response import Response
from rest_framework.parsers import JSONParser 
from api.models import News

from rest_framework.decorators import api_view
# Create your views here.

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
                scope = Scope.objects.get(user_id = user.id, name = city_name)
                post_list = News.objects.filter(feed_id = scope.id)

                posts = ApiNewsSerializers(post_list, many = True)
                key = ""
            elif name == 'world-countries':
                countries_name = request.query_params.get('subname')
                locality = countries_name
                usr_id = ""
                key =""

            print(posts)
            return Response(posts.data)

