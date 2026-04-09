from rest_framework import serializers
from api.models import News, Scope, Tag

class ApiNewsSerializers(serializers.ModelSerializer):
    class Meta:
        model = News
        fields = '__all__'
    

class ApiScopeSerializers(serializers.ModelSerializer):
    class Meta:
        model = Scope
        fields = '__all__'

class ApiTagSerializers(serializers.ModelSerializer):
    class Meta:
        model = Tag
        exclude = ['api_key']