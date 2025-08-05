from django.db import models
import uuid
# Create your models here.
class EvaluationSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.UUIDField()
    created_at = models.DateTimeField(auto_now_add=True)
    summary = models.TextField(blank=True, null=True)  # GPT 최종 평가

    def __str__(self):
        return f"Session {self.id} (User {self.user_id})"
    
    
class QuestionAnswerPair(models.Model):
    session = models.ForeignKey(EvaluationSession, on_delete=models.CASCADE, related_name='qa_pairs')
    order = models.IntegerField()  # 1, 2, 3...
    question = models.TextField()
    answer = models.TextField()
    
    is_ended = models.BooleanField()
    reason_end = models.TextField()
    context_matched = models.BooleanField()
    reason_context = models.TextField()

    gpt_comment = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Q{self.order} (Session {self.session_id})"