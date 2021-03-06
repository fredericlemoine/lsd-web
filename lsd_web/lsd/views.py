from django.shortcuts import render
from lsd.tasks import submitLSD
from lsd.models import LSDRun, RunTrees, RunTaxonDates, RunOutGroups
from django.contrib.auth import views
import base64
from lsd.controlers.LSDRunParser import LSDRunParser
from lsd.controlers.TreeRenderer import TreeRenderer
from lsd.controlers.UserManager import UserManager
from lsd.exceptions.RunParserException import RunParserException
from lsd_forms import RegistrationForm
from django.shortcuts import redirect
from lsd.controlers.TreeJSON import TreeJSON
import math
import logging
import os

# Create your views here.
from django.http import HttpResponse

def index(request):
    context = {
        
    }
    return  render(request, 'lsd/home.html', context)

def help(request):
    context = {
    
    }
    return  render(request, 'lsd/help.html', context)


def new_run(request):
    context = {
    
    }
    return  render(request, 'lsd/new_run.html', context)

def user_page(request):
    context = {
    
    }
    return  render(request, 'lsd/user_page.html', context)

def submit_run(request):

    try:
        r = LSDRunParser.parse(request)
        r.save()
    except RunParserException as e:
        context = {
            'error' : e.message+" : "+e.errors
        }
        return  render(request, 'lsd/new_run.html', context)
    except:
        logging.exception("message")
        context = {
            'error' : "Some information is missing"
        }
        return  render(request, 'lsd/new_run.html', context)
    else:
        if request.user.is_authenticated():
	    r.run_user=request.user
	    r.save()
	lsdpath = os.getenv('LSDPATH')
	jid=submitLSD.delay(r.id,lsdpath)
	context = {
	    'status' : "Pending",
	    'statusshort': r.run_status,
	    'jid'    : jid,
	    'times'  : 1,
	    'refresh': 2,
	}
	return  render(request, 'lsd/wait_run.html', context)

def create_account(request):
    if request.user.is_authenticated():
        return redirect('/')
    form = RegistrationForm()
    if request.method == 'POST':
        form = RegistrationForm(request.POST)
        if form.is_valid():
            datas={}
            datas['username']=form.cleaned_data['username']
            datas['email']=form.cleaned_data['email']
            datas['password1']=form.cleaned_data['password1']
            datas['firstname']=form.cleaned_data['firstname']
            datas['lastname']=form.cleaned_data['lastname']
            form.save(datas)
            request.session['registered']=True #For display purposes
            return redirect('/')
        else:
            registration_form = form #Display form with error messages (incorrect fields, etc)
    return render(request, 'lsd/create_account.html', locals())

def check_run(request):
    jid   = request.GET['jid'];
    times = 1;
    if 'times' in request.GET:
        times = request.GET['times'];

    try:
        r = LSDRun.objects.get(run_name=jid)
    except:
        logging.exception("message")
        context = {
            'error' : "The run \""+str(jid)+"\" does not exist"
        }
        return  render(request, 'lsd/error_generic.html', context)

    if r.run_status == r.RUNNING:
        context = {
            'status' : "Running",
            'statusshort': r.run_status,
            'jid'    : jid,
            'times'  : int(times)+1,
            'refresh': math.pow(2,int(times)+1)
        }
        return  render(request, 'lsd/wait_run.html', context)

    if r.run_status == r.PENDING :
        context = {
            'status' : "Pending",
            'statusshort': r.run_status,
            'jid'    : jid,
            'times'  : int(times)+1,
            'refresh': math.pow(2,int(times)+1)
        }
        return  render(request, 'lsd/wait_run.html', context)        

    if(r.run_status == r.FINISHED):
        treeData = []
        treeDateData = []

        if 'png' in request.GET and (int)(request.GET['png'])<len( r.resulttree_set.all()):
            t = r.resulttree_set.all()[(int)(request.GET['png'])]
            imagehex64_2=TreeRenderer.renderNexus_own(t.result_nexus, 1200)
            res = HttpResponse(imagehex64_2)
            res['Content-Type'] = 'image/png'
            res['Content-Disposition'] = 'attachment; filename=tree.png'
            return res

        if 'json' in request.GET and (int)(request.GET['json'])<len(r.resulttree_set.all()):
            t = r.resulttree_set.all()[(int)(request.GET['json'])]
            treestring = "#NEXUS\nBegin trees;\ntree 1 = "+t.result_nexus+"\nEnd;\n"
            nexusIO = Nexus.Nexus.Nexus(treestring)
            tj = TreeJSON(nexusIO.trees[0])
            tree_json=tj.to_json(tj.to_serializable(nexusIO.trees[0].root))
            res = HttpResponse(tree_json)
            res['Content-Type'] = 'application/json'
            # res['Content-Disposition'] = 'attachment; filename=tree.json'
            return res

        if 'nexus' in request.GET and (int)(request.GET['nexus'])<len(r.resulttree_set.all()):
            t = r.resulttree_set.all()[(int)(request.GET['nexus'])]
            treestring = "#NEXUS\nBegin trees;\ntree 1 = "+t.result_nexus+"\nEnd;\n";
            res = HttpResponse(treestring)
            res['Content-Type'] = 'text/plain'
            res['Content-Disposition'] = 'attachment; filename=tree.nexus'
            return res

        
        if 'newick' in request.GET and (int)(request.GET['newick'])<len(r.resulttree_set.all()):
            t = r.resulttree_set.all()[(int)(request.GET['newick'])]
            treestring = t.result_nexus
            res = HttpResponse(treestring)
            res['Content-Type'] = 'text/plain'
            # res['Content-Disposition'] = 'attachment; filename=tree.json'
            return res

        context = {
            'status'     : "Finished",
            'statusshort': r.run_status,
            'lsdrun'     : r,
            'trees'      : r.resulttree_set.all(),
            'treeimages' : treeData,
            'output'     : r.run_out_message,
            'error'      : r.run_err_message,
            'jid'        : jid,
            'baseurl'       : request.build_absolute_uri()
        }
        return  render(request, 'lsd/display_run.html', context)

    if(r.run_status == r.ERROR):
        context = {
            'error': r.run_err_message,
            'out'  : r.run_out_message,
            'jid'   : jid
        }
        return  render(request, 'lsd/error_run.html', context)
