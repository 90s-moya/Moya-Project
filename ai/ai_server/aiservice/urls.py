from django.urls import path
from . import views
urlpatterns = [
  # path("prompt-start/", views.evaluate_audio_pair,name='evaluate'),

  path("prompt-stt/", views.evaluate_single_pair, name='evaluate_single'), 
]