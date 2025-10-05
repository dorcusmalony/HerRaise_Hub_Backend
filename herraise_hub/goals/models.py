from django.db import models

# Create your models here.

from django.conf import settings

class Goal(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    description = models.TextField()
    is_completed = models.BooleanField(default=False)
    deadline = models.DateField(null=True, blank=True)

    def __str__(self):
        return str(self.title)
