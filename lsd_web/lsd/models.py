from __future__ import unicode_literals

from django.db import models
from datetime import datetime

# Create your models here.
class LSDRun(models.Model):
    run_date             = models.DateTimeField('date of run')
    run_root_date        = models.FloatField(default=0)
    run_tips_date        = models.FloatField(default=1)
    run_constraints      = models.BooleanField(default=False)
    run_variance         = models.BooleanField(default=False)
    run_seq_length       = models.IntegerField(default=1000)
    run_param_variance   = models.FloatField(default=10)
    run_rooting_method   = models.CharField(max_length=10)
    run_rate_lower_bound = models.FloatField(default=0.00001)
    run_name             = models.CharField(max_length=100, default="No Name")

    def __str__(self):
        return self.run_name 
#+ " : " + datetime.strptime(self.run_date, "%Y-%m-%d %H:%M:%S+0000")

class RunTrees(models.Model):
    lsd_run = models.ForeignKey(
        LSDRun,
        on_delete=models.CASCADE
    )
    tree_newick       = models.TextField()
    tree_index        = models.IntegerField()
    tree_subst_rate   = models.FloatField()

class RunTaxonDates(models.Model):
    lsd_run    = models.ForeignKey(
        LSDRun,
        on_delete=models.CASCADE
    )
    taxon_name = models.CharField(max_length=300)
    taxon_date = models.FloatField()

class RunOutGroups(models.Model):
    lsd_run    = models.ForeignKey(
        LSDRun,
        on_delete=models.CASCADE
    )
    taxon_name = models.CharField(max_length=300)

class ResultTree(models.Model):
    run_tree    = models.ForeignKey(
        RunTrees,
        on_delete=models.CASCADE
    )
    result_subst_rate = models.FloatField()
    result_root_date  = models.FloatField()
    result_newick     = models.TextField()
    result_date_newick= models.TextField()
    result_nexus      = models.TextField()
