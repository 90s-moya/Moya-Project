from rest_framework import serializers
from .models import EvaluationSession, QuestionAnswerPair

class QuestionAnswerPairSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionAnswerPair
        fields = '__all__'

class EvaluationSessionSerializer(serializers.ModelSerializer):
    qa_pairs = QuestionAnswerPairSerializer(many=True, read_only=True)

    class Meta:
        model = EvaluationSession
        fields = '__all__'
