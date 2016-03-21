var trees = []

function parse_newick(newick_str,curnode,pos,level){
    curnode.suc = [];
    curnode.tax = "";
    curnode.date_s = "";
    curnode.date_n = 0.0;
    curnode.brlen = 0.0;
    var children = 0;
    var match;
    while(pos < newick_str.length){
	var matchDate = newick_str.substr(pos).match(/^\[&date=(\d+(\.\d+){0,1})\]/);
	var matchBrlen = newick_str.substr(pos).match(/^\:(\d+(\.\d+){0,1})/);
	if(newick_str.substr(pos,1) == "("){
	    console.log("pos "+pos+" new node (");
	    //id++;
	    if(level==0){
		pos = parse_newick(newick_str,curnode,pos+1,level+1);
	    }else{
		curnode.suc[children] = {};
		children++;
		pos = parse_newick(newick_str,curnode.suc[children-1],pos+1,level+1);
	    }
	} else if(newick_str.substr(pos,1) == ")"){
	    console.log("pos "+pos+" End Node )");
	    pos++;
	    return(pos);
	} else if(newick_str.substr(pos,1) == ","){
	    console.log("pos "+pos+" Next Node ,");
	    pos++;
	} else if(matchDate != null){
	    console.log(matchDate[0]+" "+matchDate[1]);
	    if(level==0){
		curnode.date_n = parseFloat(matchDate[1]);
	    }else{
		curnode.suc[children-1].date_n = parseFloat(matchDate[1]);
	    }
	    pos+=matchDate[0].length;
	} else if(matchBrlen != null){
	    console.log(matchBrlen[0]);
	    if(level == 0){
		curnode.brlen = parseFloat(matchBrlen[1]);		
	    }else{
		curnode.suc[children-1].brlen = parseFloat(matchBrlen[1]);
	    }
	    pos+=matchBrlen[0].length;
	} else if(newick_str.substr(pos,1) == ";"){
	    console.log("pos "+pos+" End tree");
	    pos++;
	} else {
	    console.log(" --> Taxon ?");
	    var match = newick_str.substr(pos).match(/^([^(\[\]\(\)\:;\,)]*)/);
	    console.log(match[0]);
	    var lastnode = {};
	    lastnode.suc = [];
	    lastnode.tax = match[1];
	    lastnode.date_s = "";
	    lastnode.date_n = 0.0;
	    lastnode.brlen = 0.0;
	    curnode.suc[children] = lastnode;
	    children++;
	    pos += match[0].length;
	}
    }
}

function add_ids_to_json_tree(treejson,id){
    treejson.id = id;
    for(var n=0;n<treejson.suc.length;n++){
	id++;
	id = add_ids_to_json_tree(treejson.suc[n],id);
    }
    return id;
}



function clear_canvas(canvas,width,height,zoom){
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height*zoom);
}

function draw_tree(canvas,tree,width,height,zoom,offset){
    // Create an empty project and a view for the canvas:
    var ctx = canvas.getContext("2d");
    canvas.width  = width;
    canvas.height = height;
    var level=0
    var border=40
    var min_y=border
    var curheight=height * zoom
    var curwidth= width
    var max_y=curheight-border
    var max_num_disp_years=25
    var root = tree
    var point_radius=2
    max_date = tree_max_date(tree)
    min_date = tree_min_date(tree)
    //console.log(min_date+" "+max_date)
    // y coords
    // console.log(JSON.stringify(tree))
    var total_terminals=count_terminals(tree)
    //console.log(total_terminals)
    var y_dict={}
    tree_y_coords(y_dict,root,curheight,border,0,total_terminals,offset)
    //console.log(JSON.stringify(y_dict))
    draw_scale(ctx,min_date,max_date,width,curheight,border,max_num_disp_years)
    coordinates(ctx,root.id,root,y_dict,min_date,max_date,width,0,0,border,point_radius)
}

function count_terminals(node){
    var n=0
    var terminals=0
    if(!node || !node.suc || node.suc.length==0){
	terminals++
    }else{
	var terminals=0
	for(var n=0; n<node.suc.length;n++){
	    terminals += count_terminals(node.suc[n])
	}
    }
    return(terminals)
}

function tree_min_date(node){
    var mind = node.date_n
    if(node.suc.length==0){
	mind = node.date_n
    }else{
	for(var n=0; n<node.suc.length;n++){
	    mind = Math.min(mind,tree_min_date(node.suc[n]))
	}
    }
    return(mind)
}


function tree_max_date(node){
    var maxd = node.date_n
    if(!node || !node.suc || node.suc.length==0){
	maxd = node.date_n
    }else{
	for(var n=0; n<node.suc.length;n++){
	    maxd = Math.max(maxd,tree_max_date(node.suc[n]))
	}
    }
    return(maxd)

}

function tree_y_coords(y_dict, tree_node, height, border,num_terminal,total_terminals,offset){
    if(!tree_node.suc || tree_node.suc.length==0){
        y_dict[tree_node.id]=num_terminal*((height-2*border)*1.0/(total_terminals-1))+border+offset
        num_terminal+=1
    } else{
        var meany=0
        for(var n=0; n<tree_node.suc.length;n++){
	    num_terminal=tree_y_coords(y_dict,tree_node.suc[n],height,border,num_terminal,total_terminals,offset)
            meany+=y_dict[tree_node.suc[n].id]
	}
	meany=meany*1.0/tree_node.suc.length
	y_dict[tree_node.id] = meany
    }
    return num_terminal
}

function coordinates(ctx, root_id,node,y_dict,min_date,max_date,width,prev_x,prev_y,border,point_radius){
    var middle=y_dict[node.id]
    //On ajoute les lignes verticales precedentes si non root

    // On prend la date et on calcul la position x
    var x_coord= (node.date_n-min_date) * (width-2*border) * 1.0 / (max_date-min_date)+border
    
    // On affiche le noeud
    ctx.beginPath();
    ctx.arc(x_coord,middle,point_radius,0,2*Math.PI);
    ctx.fillStyle = "#000000";        
    ctx.fill();
    ctx.stroke();

    //# On affiche la ligne horizontale
    ctx.beginPath();
    ctx.moveTo(prev_x,prev_y);
    if(node.id != root_id){
	ctx.moveTo(prev_x,prev_y);
	//ctx.lineTo(prev_x,middle);
	ctx.lineTo(x_coord, middle);
    }else{
	//ctx.moveTo(prev_x,middle);
    }
    //ctx.lineTo(x_coord, middle);
    ctx.strokeStyle= '#000000';
    ctx.lineWidth=2;
    ctx.lineCap = 'round';
    ctx.lineJoin= 'round';
    ctx.stroke();

    // On affiche la date du noeud
    var year  = Math.floor(node.date_n)
    var month = node.date_n-year
    var month = Math.floor(month*12)+1
    var date  = year+"/"+pad(month,2)
    
    ctx.beginPath();
    ctx.font = "10px Arial";
    ctx.fillStyle = '#000000';
    ctx.textAlign = "left";
    ctx.fillText(date,x_coord-ctx.measureText(date).width-point_radius,middle-2-point_radius);
    
    // On affiche le nom du noeud
    if(node.suc.length == 0){
	ctx.beginPath();
	ctx.font = "12px Arial";
	ctx.fillStyle = '#000000';
	ctx.textAlign = "left";
	ctx.fillText(node.tax,x_coord+point_radius+2,middle+2);
    }

    // tw,th = image_draw.textsize(date, font=fnt_small)
    // image_draw.text([x_coord-tw-point_radius,middle-th], date, (0,0,0,255), font=fnt_small)

    //# On affiche le nom du noeud
    // if(len(node.succ)==0):
    // print(node.data.taxon)
    // tw,th = image_draw.textsize(node.data.taxon, font=fnt_large)
    // image_draw.text([x_coord+point_radius*2,middle-th/2], node.data.taxon, (0,0,0,255), font=fnt_large)


    // On passe aux suivants
    for(var n=0;n<node.suc.length;n++){
	coordinates(ctx,root_id,node.suc[n],y_dict,min_date,max_date,width,x_coord,middle, border,point_radius)
    }
}

function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function draw_scale(ctx, min_date,max_date,width,height,border,max_num_disp_years){
    var max_year = Math.ceil(max_date)
    var min_year = Math.floor(min_date)
    var mod= Math.ceil((max_year-min_year)*1.0/max_num_disp_years)
    for(var year=min_year; year<=max_year; year++){
        if (year%mod==0){
            var x_coord= (year-min_date) * (width-2*border) * 1.0 / (max_date-min_date)+border
	    // We draw the scale line
	    ctx.beginPath();
	    ctx.setLineDash([4, 4]);
	    ctx.moveTo(x_coord,0);
	    ctx.lineTo(x_coord,height);
	    ctx.strokeStyle= 'grey';
	    ctx.lineWidth=1;
	    ctx.lineCap = 'round';
	    ctx.lineJoin= 'round';
	    ctx.stroke();
	    ctx.setLineDash([]);

	    // We write the legend
	    ctx.beginPath();
	    ctx.font = "10px Arial";
	    ctx.fillStyle = 'grey';
	    ctx.textAlign = "left";
	    ctx.fillText(year,x_coord,10);
	}
    }
}

function init_canvas(){
    $('.canvaswrapper').each(function(index,item){
	var height=500;
	var width=1000;
	var zoom=1;
	var prevy=0;
	var offset=0;
	var y_speed = 0;
	var last_time = null;
	var still_down = false;
	var animation = null;

	var canvas = $(item).find("canvas").get(0);
	$(item).append("<input id=\"zoomslider_"+index+"\" type=\"range\" min=\"1\" max=\"20\" step=\"0.5\" value=\"1\" orient=\"vertical\"/>");
	$('#zoomslider_'+index).on("input change",function(){
	    var curzoom = $(this).val();
	    //console.log(canvas);
	    clear_canvas(canvas,width,height,zoom);
	    zoom = curzoom;
	    $("#valuezoom").html(zoom);
	    if(offset<-((height)*zoom-$(canvas).height())){
		offset = -(height)*zoom+$(canvas).height();
	    }
	    if(trees.length >= index){
      		draw_tree(canvas,trees[index],$(canvas).width(),height,zoom,offset);
	    }
	});

	$(canvas).mousedown(function(e){
	    still_down = true;
	    prevy=e.pageY;
	    last_time = Date.now();
	    if(animation != null){
		clearInterval(animation);
		animation = null;
	    }
	});

	$(canvas).mousemove(function(e){
	    if(still_down){
		offset-=(prevy-e.pageY);
		if(last_time != null){
		    y_speed = (prevy-e.pageY) / ((Date.now() - last_time));
		}
		last_time = Date.now();
		prevy=e.pageY;
		if(offset>0){
		    offset=0;
		}
		if(offset<-((height)*zoom-$(canvas).height())){
		    offset = -(height)*zoom+$(canvas).height();
		}
		//console.log("Up at: "+e.pageY," ==> Offset: "+offset);
		console.log("Y Speed : "+y_speed);
		draw_tree(canvas,trees[index],$(canvas).width(),height,zoom,offset);
	    }
	});

	$(canvas).on("mouseout mouseup",function(e){
	    if(animation === null && still_down){
		still_down=false;
		animation = setInterval(function(){
		    offset-=y_speed*10
		    if(offset>0){
			offset=0;
			y_speed = 0;
		    }
		    if(offset<-((height)*zoom-$(canvas).height())){
			offset = -(height)*zoom+$(canvas).height();
			y_speed = 0;
		    }
		    draw_tree(canvas,trees[index],$(canvas).width(),height,zoom,offset);
		    console.log("Animation: "+offset+ " Speed : "+y_speed);
		    y_speed /= 1.1;
		    if(Math.abs(y_speed) < 0.5){
			console.log("stop animation");
			clearInterval(animation);
			animation = null;
		    }
		},10);
	    }
	});

	if(canvas.hasAttribute('data-url')){
	var tree_url=$(canvas).data('url');
	    $.ajax({
		url: tree_url,
		type: 'GET',
		dataType: 'json',
		success: function(code_json,status){
		    trees[index] = code_json
		    draw_tree(canvas,trees[index],$(canvas).width(),height,zoom,offset);
		}
	    });
	} else if(canvas.hasAttribute('data-json')) {
	    var treejson=$(canvas).data('json');
	    trees[index] = treejson
	    draw_tree(canvas,trees[index],$(canvas).width(),height,zoom,offset);
 	} else if (canvas.hasAttribute('data-newick')){
	    var treenewick = $(canvas).data('newick');
	    var treejson  = {};
	    parse_newick(treenewick,treejson,0,0);
	    add_ids_to_json_tree(treejson,0);
	    console.log(JSON.stringify(treejson))
	    trees[index] = treejson;
	    draw_tree(canvas,trees[index],$(canvas).width(),height,zoom,offset);
	}
    });
}

// get mouse pos relative to canvas (yours is fine, this is just different)
function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

$(document).ready(function(){
    init_canvas();
});
