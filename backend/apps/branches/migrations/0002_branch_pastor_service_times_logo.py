from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("branches", "0001_initial_branch"),
    ]

    operations = [
        migrations.AddField(
            model_name="branch",
            name="pastor",
            field=models.CharField(blank=True, max_length=200, verbose_name="pastor"),
        ),
        migrations.AddField(
            model_name="branch",
            name="service_times",
            field=models.JSONField(blank=True, default=list, verbose_name="service times"),
        ),
        migrations.AddField(
            model_name="branch",
            name="logo",
            field=models.ImageField(blank=True, null=True, upload_to="branches/logos/", verbose_name="logo"),
        ),
    ]
