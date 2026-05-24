
from search_agents.models import QueryModel
from rest_framework import serializers

class QuerySerializer(serializers.ModelSerializer):
    class Meta:
        model = QueryModel
        fields = '__all__'