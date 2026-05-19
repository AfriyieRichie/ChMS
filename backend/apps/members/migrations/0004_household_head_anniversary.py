from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("members", "0003_membertag"),
    ]

    operations = [
        migrations.AddField(
            model_name="household",
            name="anniversary_date",
            field=models.DateField(blank=True, null=True, verbose_name="anniversary date"),
        ),
        migrations.AddField(
            model_name="household",
            name="head",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="headed_households",
                to="members.member",
                verbose_name="head of household",
            ),
        ),
    ]
