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
from bs4 import BeautifulSoup
from rest_framework.decorators import api_view
# Create your views here.

def clean_post(post):
    description = ""
    if post.get("description"):
        soup = BeautifulSoup(post["description"], "html.parser")
        description = soup.get_text().strip()

    return {
        "id": post["id"],
        "title": post["title"],
        "description": description,
        "published_at": post["published_at"],  # leave as is for now
        "url": post["url"],
        "feed": post["feed"],
    }

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
                locality = countries_name
                user = Tag.objects.get(name = name)
                scope = Scope.objects.get(user_id = user.id, name = locality)
                post_list = News.objects.filter(feed_id = scope.id)

                posts = ApiNewsSerializers(post_list, many = True)
                key =""

            cleaned = [clean_post(p) for p in posts.data]
            # print(posts)
            return Response(cleaned)

