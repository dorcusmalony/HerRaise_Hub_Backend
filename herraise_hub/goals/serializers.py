from rest_framework import serializers
from .models import Goal

class GoalSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Goal
        fields = ['id', 'user', 'title', 'description', 'is_completed', 'deadline']
