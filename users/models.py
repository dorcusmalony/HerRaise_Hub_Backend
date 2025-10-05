from django.db import models

# Create your models here.
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    ROLE_CHOICES = (
        ('mentor', 'Mentor'),
        ('mentee', 'Mentee'),
        ('admin', 'Admin'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='mentee')

    def __str__(self):
        return str(self.username)
