from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Document
from .serializers import DocumentSerializer


class DocumentListCreateView(generics.ListCreateAPIView):
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Document.objects.filter(
            user=self.request.user
        )

    def perform_create(self, serializer):
        serializer.save()


class DocumentDetailView(
    generics.RetrieveDestroyAPIView
):
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Document.objects.filter(
            user=self.request.user
        )

    def perform_destroy(self, instance):
        instance.file.delete(
            save=False
        )

        instance.delete()