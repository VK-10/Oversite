from django.shortcuts import render

# Create your views here.
# @cache_page(60 * 10)
@api_view(['GET'])
def news(request):
        if request.method == 'GET':
            name = request.query_params.get('name')
            locality = ""
            usr_id = ""
            key = ""

            if name == 'technology':
                city_name = request.query_params.get('subname')
                locality = city_name
                user = Tag.objects.get(name = name)
                scope = Scope.objects.get(user_id = user.id, name = locality)
                post_list = News.objects.filter(feed_id = scope.id)

                posts = ApiNewsSerializers(post_list, many = True)
                key = ""
            elif name == 'geo_politics':
                countries_name = request.query_params.get('subname')
                locality = countries_name.rstrip('/')
                locality = countries_map(locality)
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
