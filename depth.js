//////////////////////////////////////////////////////////////
////////////////////// Global Resources //////////////////////
//////////////////////////////////////////////////////////////

// Set up plane and popups
var paper_w = $("#plane").width();
var paper_h = $("#plane").height();
var plane = document.getElementById("plane");
var paper = Raphael(plane, paper_w, paper_h);
var median_type = parseInt($("#medianpicker").val());
$("#popover").hide();
$("#info_popover").hide();
var median_descs = ["Coordinate-wise Depth", "Nested Hull Depth", "Simplicial Depth", "Halfspace Depth"];

var median_descs_long = [
    "One easy definition of a 2D median of a point set is to pick the point whose x coordinate is the median of the x coordinates of the points, and whose y coordinate is the median of the y coordinates of the points. <br><br>However, this definition is suboptimal as it gives each point two unrelated quantities representing its depth, and these quantities change if we consider a different system of coordinates.",
    "One algorithm for computing the 1D median is to recursively remove the minimum and maximum point until you are left with 1 or 2 points. (at which point you average these). <br><br>In 2D, the \"most extreme\" points in the point set are those on the <b>convex hull</b>. To compute the nested hull median, you recursively peel off convex hulls of the point set until 1 or 2 points remain (at which point you again average). <br><br>The nested hull depth of a point is defined as the number of hulls it is inside. Clearly, the nested hull median maximizes this depth.",
    "One property of the 1D median is that it is in the maximum number of open intervals made from pairs of points in the point set. An interval in 1D is a special case of a <b>simplex</b>, and in 2D a simplex is a triangle. The simplicial median computed here is the point in the point set contained in the most triangles created by triples of points from the point set. <br><br>(Note: A better definition of the simplicial median is the point in space contained in the most triangles, but that is prohibitively expensive to compute in an interactive visualization)",
    "A point in 1D cuts the real line into 2 halves. The 1D median has the property that there are an equal number of points in the point set on either side of it. <br><br>In 2D, there are an infinite number of ways to split the plane with a line through a point. One side of such a split is called a <b>halfspace</b>. The halfspace depth of a point is the minimum number of points on one side of <i>any</i> halfspace through that point. The halfspace median is the point in the point set with maximum halfspace depth."
];

var allow_popovers = true;
var intro_unread = true;

// Graphics details
var point_size = 6;
var median_size = 8;
var proj_point_size = 4;
var proj_median_size = 6;
var point_color = "#212121";
var hull_grays = ["#E0E0E0","#BDBDBD","#9E9E9E","#757575","#616161","#424242","#212121"];

// Data for the median
var last_median_type = -1;
var median;
var points = [];

// median of medians extras
var bogus_med_y_points = [];
var bogus_med_x_points = [];
var bogus_medx;
var bogus_medy;

// nested hulls extras
var hulls = [];
var hull_lines = [];

// simplicial median extras
var cg_lines = [];
var triangles = [];
var inters = [];
var lines = [];
var points_drawn = 0;

// halfspace extras
var h_space_lines = [];

// Extra stuff for popovers
var depth_extras = [];
var depth_extras_hidden = [];

// Register all the event handlers
$(document).ready(function() {
    median = draw_point(paper_w/2, paper_h/2, "#F44336", 7, true, false).data("median", true);
    $("#plane").click(handle_click);
    $("#clear_points").click(clear_points);
    $("#medianpicker").change(function(){
        dismiss_info();
        median_type = parseInt($(this).val());
        draw_median();
    });
    $("#info").click(show_info);
    show_info();
    $("#dismiss").click(dismiss_info);
    $("#start").click(function() {
                        dismiss_info();
                        $("#start").hide();
                        $("#dismiss").show();
                        $("#controls").show();
                    });
    
    $(window).resize(function() {
        dismiss_info();
        var old_w = paper_w;
        var old_h = paper_h;
        paper_w = $("#plane").width();
        paper_h = $("#plane").height();
        paper.setSize(paper_w, paper_h);
        cleanup();
        var x_scale = paper_w/old_w;
        var y_scale = paper_h/old_h;
        for (var i = 0; i < points.length; i++) {
            old_x = points[i].attr("cx");
            old_y = points[i].attr("cy");
            if (i+1 < points.length) {
                points[i].attr({cx: old_x * x_scale, cy: old_y * y_scale}, 100);
            } else {
                points[i].animate({cx: old_x * x_scale, cy: old_y * y_scale}, 200, 
                    function() {
                        draw_median();
                    });
            }
        }
        if (points.length == 0) {
            draw_median();
        }
    });
});

////////////////////////////////////////////////////////////
////////////////////// Event Handlers //////////////////////
////////////////////////////////////////////////////////////

function show_info() {
    allow_popovers = false;
    if (points.length == 0 && intro_unread) {
        $("#ip_title").html("What is data depth?");
        $("#ip_content").html("The <b>depth</b> of a point in a point set is a measure of how central a point is. In 1D, the median of a point set is the deepest point according to several different definitions of depth. With this tool, you can explore some definitions of data depth in 2D, and how each definition yields its own 2D generalization of \"median\" for a point set.<br><br>Click anywhere to add points, and hover over points to see their depth.");
    } else {
        $("#ip_title").html(median_descs[median_type-1]);
        $("#ip_content").html(median_descs_long[median_type-1]);   
    }
    intro_unread = false;
    $("#info_popover").width(paper_w-40);
    $("#info_popover").height(paper_h-40);
    $("#info_popover").css("left", $('#plane').offset().left)
                      .css("top", $('#plane').offset().top);


    $("#info_popover").fadeIn(50);
}

function dismiss_info() {
    allow_popovers = true;
    $("#info_popover").fadeOut(50);
    $("#controls").show();
}

// Clear the points
function clear_points() {
    dismiss_info();
    med_x = median.attr("cx");
    med_y = median.attr("cy");
    for (var i = 0; i < points.length; i++) {
        if (i+1 < points.length) {
            points[i].animate({cx: med_x, cy: med_y}, 500 - 10*i);
        } else {
            points[i].animate({cx: med_x, cy: med_y}, 200, 
                function() {
                    paper.clear();
                    cleanup();
                    points = [];
                    median = draw_point(med_x, med_y, "#F44336", 7, true, false).data("median", true);
                    draw_median();
                });
        }
    }
}

// Add the point where they clicked, recompute median
function handle_click(e) {
    var rect = plane.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;

    new_point = draw_point(x, y, point_color, point_size, true, true);
    points.push(new_point);

    draw_median();
}

// Draws the median of points based on currently chosen definition
// TODO: If you're going to simplicial and you had a ton of points, ptfo
function draw_median() {
    allow_popovers = false;
    if (points.length == 0) {
        median.animate({cx:paper_w/2, cy:paper_h/2}, 200);
        return;
    }

    // really high quality modular stuff here man
    if (median_type != last_median_type || median_type == 2 || median_type == 4) {
        cleanup();
    }

    median.toFront();
    switch(median_type) {
        case 1:
            draw_median_x_y();
            break;
        case 2:
            draw_hull_median();
            break;
        case 3:
            draw_simplicial_median();
            break;
        case 4:
            draw_halfspace_median();
            break;    
        default:
            alert("bad option for median type used " + median_type);
    }
    last_median_type = median_type;
}

// Returns a string to put in the popover box for a point
function get_depth_description(point) {
    var median_descs = ["Coordinate-wise median", "Nested hull median", "Simplicial median", "Halfspace median"];
    var desc = "";
    switch(median_type) {
        case 1:
            if (points.length == 0) {
                return median_descs[median_type - 1];
            }
            if (point.data("median")) {
                depth_extras.push(draw_path(point, bogus_medx, "#F44336", 1));
                depth_extras.push(draw_path(point, bogus_medy, "#F44336", 1));
                return median_descs[median_type - 1];
            }
            depth_extras.push(draw_path(point, bogus_med_x_points[point.data("point_i")], "#F44336", 1));
            depth_extras.push(draw_path(point, bogus_med_y_points[point.data("point_i")], "#F44336", 1));
            return "x rank: " + point.data("x_rank") +"/" + points.length + "<br>" +
                   "y rank: " + point.data("y_rank") +"/" + points.length;
            break;
        case 2:
            if (point.data("median")) {
                return median_descs[median_type - 1];
            }
            if (point.data("hull_i") == 100000) {
                return "Inside innermost hull";
            } else {
                animate_hulls(point.data("hull_i"));
                return "On nested hull: " + point.data("hull_i");
            }
            break;
        case 3:
            highlight_triangles(point);
            if (point.data("median")) {
                return median_descs[median_type - 1] + "<br>Depth: " + point.data("depth");
            }
            return "Simplicial depth: " + point.data("simp_depth");
            break;
        case 4:
            animate_halfspace(point);
            if (point.data("median")) {
                return median_descs[median_type - 1] + "<br>Depth: " + point.data("depth");
            }
            return "Halfspace depth: " + point.data("h_depth");
            break;    
        default:
            alert("bad option for median type used " + median_type - 1);
    }
}

// Basically just kill everything that isn't just the points
function cleanup() {
    for (var i = 0; i < points.length; i++) {  
        points[i].animate({fill:"#000"});
        points[i].removeData();
        points[i].data("point_i", i);
    }
    // median.removeData();
    median.data("median", true);

    // cleanup med_x med_y
    for(var i = 0; i < bogus_med_x_points.length; i++) {
        bogus_med_x_points[i].remove();
        bogus_med_y_points[i].remove();
    }

    bogus_med_x_points = [];
    bogus_med_y_points = [];

    if (bogus_medx && bogus_medy) {
        bogus_medx.remove();
        bogus_medy.remove();
        bogus_medx = false;
        bogus_medy = false;
    }

    // cleanup nested hulls
    for(var i = 0; i < hull_lines.length; i++) {
        hull_lines[i].remove();
    }
    hull_lines = [];

    // cleanup simplicial
    for(var i = 0; i < cg_lines.length; i++) {
        for(var j = 0; j < cg_lines[i].length; j++) {
            cg_lines[i][j].remove();
        }
    }
    cg_lines = [];
    triangles = [];
    inters = [];
    lines = [];
    points_drawn = 0;

    for(var i = 0; i < h_space_lines.length; i++) {
        h_space_lines[i].remove();
    }
    h_space_lines = [];
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////// 
//////////////////////////////////////// Different median implementations ////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////
// Coordinatewise //
////////////////////

function draw_median_x_y() {
    var xs = []
    var ys = []

    var num_points = points.length;
    for (var i = 0; i < num_points; i++) {
        xs.push({data: points[i].attr("cx"), i:i});
        ys.push({data: points[i].attr("cy"), i:i});
        if (!points[i].data("bogus_drawn")) {
            x_bog = draw_point(points[i].attr("cx"), points[i].attr("cy"), "#9E9E9E", proj_point_size, false, false);
            y_bog = draw_point(points[i].attr("cx"), points[i].attr("cy"), "#9E9E9E", proj_point_size, false, false);
            bogus_med_x_points.push(x_bog);
            bogus_med_y_points.push(y_bog);
            x_bog.animate({cy:paper_h-(proj_point_size)}, 200);
            y_bog.animate({cx:proj_point_size}, 200);
            points[i].data("bogus_drawn", true);   
        }
    }

    med_x = get_median(xs);
    med_y = get_median(ys);

    for (var rank_i = 0; rank_i < num_points; rank_i++) {
        x_point = xs[rank_i];
        points[x_point.i].data("x_rank", rank_i + 1);
        y_point = ys[rank_i];
        points[y_point.i].data("y_rank", rank_i + 1);
    }

    if (!bogus_medx && !bogus_medy) {
        bogus_medx = draw_point(proj_median_size, paper_h-(proj_median_size), "#EF5350", proj_median_size, false, false);
        bogus_medy = draw_point(proj_median_size, paper_h-(proj_median_size), "#EF5350", proj_median_size, false, false);
    }
    bogus_medx.animate({cx:med_x});
    bogus_medx.toFront();
    bogus_medy.animate({cy:med_y});
    bogus_medy.toFront();
    median.animate({cx: med_x, cy: med_y}, 200, function(){allow_popovers = true;});
}

//////////////////
// Nested Hulls //
//////////////////

function draw_hull_median() {
    total_points = points.length;

    for (var i = 0; i < points.length; i++) {
        points[i].data("hull_i", 100000);
    }

    if (total_points == 1) {
        median.animate({cx: points[0].attr("cx"), cy: points[0].attr("cy")}, 200);
        return;
    }

    if (total_points == 2) {
        median.animate({cx: (points[0].attr("cx") + points[1].attr("cx"))/2, 
                        cy: (points[0].attr("cy") + points[1].attr("cy"))/2}, 200);
        return;
    }

    new_hull = make_hull(0); 
    hulls = [new_hull];    

    points_remaining = total_points - new_hull.length;

    hull_i = 1;

    while (points_remaining > 2) {
        new_hull = make_hull(hull_i);
        hulls.push(new_hull);
        points_remaining -= new_hull.length;
        hull_i += 1
    }

    med_x = 0;
    med_y = 0;
    num_non_hull = 0;

    for (var i = 0; i < points.length; i++) {
        if (points[i].data("hull_i") >= (hull_i - 1)) {
            med_x += points[i].attr("cx");
            med_y += points[i].attr("cy");
            num_non_hull += 1;
        }
    }
    median.data("depth", hull_i);
    median.animate({cx: med_x / num_non_hull, cy: med_y / num_non_hull}, 200, function(){allow_popovers = true;});
}


// FACT: there are three undone points to hull up when you get here or you're screwed
function make_hull(hull_i) {
    xs = [];

    // Get first hull point
    var this_hull = [];
    for (var i = 0; i < points.length; i++) {
        xs.push(points[i].attr("cx"));
    }

    first_i = index_of_max_for_hull(xs, hull_i);
    this_hull.push(first_i);
    first = points[first_i];
    first.data("hull_i", hull_i);

    // get second hull point
    angles = [];
    x1 = first.attr("cx");
    y1 = first.attr("cy");
    for(var i = 0; i < points.length; i++) {
        if(i != first_i) {
            x2 = points[i].attr("cx");
            y2 = points[i].attr("cy");
            angles.push(Math.atan((y2-y1)/(x2-x1)));
        } else {
            angles.push(-10000000);
        }
    }
    first_i = index_of_max_for_hull(angles, hull_i);
    this_hull.push(first_i);
    first = points[first_i];
    first.data("hull_i", hull_i);
    
    // now we get the general case
    next_i = -1

    while (next_i != this_hull[0]) {
        angles = [];

        first_hull_i = this_hull[this_hull.length-2];
        second_hull_i = this_hull[this_hull.length-1];
        
        first_line = draw_path(points[first_hull_i], points[second_hull_i], hull_grays[hull_i % hull_grays.length], 1)
        hull_lines.push(first_line);
        points[first_hull_i].data("hull_line", first_line);

        for(var i = 0; i < points.length; i++) {
            if(i != first_hull_i && i != second_hull_i) {
                angles.push(angle_between3(points[first_hull_i], points[second_hull_i], points[i]));
            } else {
                angles.push(-10000000);
            }
        }
        next_i = index_of_max_for_hull(angles, hull_i);
        if (this_hull[0] != next_i) {
            this_hull.push(next_i);
        }
        points[next_i].data("hull_i", hull_i);
    }

    // close the hull
    closing_line = draw_path(points[this_hull[0]], points[this_hull[this_hull.length-1]], hull_grays[hull_i % hull_grays.length], 1);
    hull_lines.push(closing_line);
    points[this_hull[this_hull.length-1]].data("hull_line", closing_line);

    return this_hull;
}


// DANGEROUS: this is now in parallel with the state of the points YIKES
function index_of_max_for_hull(l, hull_i) {
    if (l.length === 0) {
        return -1;
    }

    var max = -10000000000;
    var max_i = -1;

    for (var i = 0; i < l.length; i++) {
        if ((points[i].data("hull_i") >= hull_i) && l[i] > max) { // i.e. only look at unhulled ones
            max_i = i;
            max = l[i];
        }
    }

    return max_i;
}

function animate_hulls(hull_i) {
    for (var i = 0; i < hulls[hull_i].length; i++) {
        depth_extras_hidden.push(points[hulls[hull_i][i]].data("hull_line").hide());
        depth_extras.push(draw_path(points[hulls[hull_i][i]], points[hulls[hull_i][(i+1)%hulls[hull_i].length]], "#000000", 2));
    }
}

////////////////
// Simplicial //
////////////////

// three cheers for n^6 time holy heack baby
function draw_simplicial_median() {
    var my_lines = [];
    if (points_drawn == 0) {
        for (var pl = 1; pl < points.length+1; pl++){   
            for(var i = pl-1; i < pl; i++) {
                my_lines = [];
                for(var j = 0; j < pl; j++){
                    if (j != i) {
                        for(var k = j; k < pl; k++){
                            if (k != i && k != j) {
                                triangles.push([points[i], points[j], points[k]]);
                            }
                        }
                        cg_line = draw_path(points[i], points[j], "#E0E0E0", 1);
                        my_lines.push(cg_line);
                        lines.push([points[i], points[j]]);
                    }
                }
                cg_lines.push(my_lines); 
            }
        }
    } else {
        for(var i = points_drawn; i < points.length; i++) {
            var my_lines = [];
            for(var j = 0; j < points.length; j++){
                if (j != i) {
                    for(var k = j; k < points.length; k++){
                        if (k != i && k != j) {
                            triangles.push([points[i], points[j], points[k]]);
                        }
                    }
                    cg_line = draw_path(points[i], points[j], "#E0E0E0", 1);
                    my_lines.push(cg_line);
                    lines.push([points[i], points[j]]);
                }
            }
            cg_lines.push(my_lines);
        }        
    }

    points_drawn = points.length;

    simp_depths = [];

    // for(var i = 0; i < lines.length; i++) {
    //     for(var j = i; j < lines.length; j++) {
    //         inter = line_intersection(lines[i][0], lines[i][1], lines[j][0], lines[j][1]);
    //         if (inter.x != -1) {
    //             inters.push(inter);
    //         }
    //     }
    // }

    for(var i = 0; i < points.length; i++) {
        points_inside = 0;
        triangles_inside = [];
        for (var j = 0; j < triangles.length; j++) {
            if (in_triangle(points[i], triangles[j])) {
                points_inside += 1;
                triangles_inside.push(j);
            }
        }
        simp_depths.push(points_inside);
        points[i].data("simp_depth", points_inside);
        points[i].data("triangles_inside", triangles_inside);
    }

    // for(var i = 0; i < inters.length; i++) {
    //     points_inside = 0;
    //     for (var j = 0; j < triangles.length; j++) {
    //         if (in_triangle({x:inters[i].x, y:inters[i].y}, triangles[j])) {
    //             points_inside += 1;
    //         }
    //     }
    //     simp_depths.push(points_inside);
    // }

    median_point_i = index_of_max(simp_depths);

    median.data("depth", simp_depths[median_point_i]);

    if (median_point_i < points.length) {
        median.animate({cx: points[median_point_i].attr("cx"), cy: points[median_point_i].attr("cy")}, 200, function(){allow_popovers = true;});    
    } else {
        median.animate({cx: inters[median_point_i-points.length].x, cy: inters[median_point_i-points.length].y}, 200, function(){allow_popovers = true;})
    }
    median.data("triangles_inside", points[median_point_i].data("triangles_inside"));
}

function index_of_max(l) {
    if (l.length === 0) {
        return -1;
    }

    var max = -10000000000;
    var max_i = -1;

    for (var i = 0; i < l.length; i++) {
        if (l[i] > max) { 
            max_i = i;
            max = l[i];
        }
    }

    return max_i;
}

// it's a determinant or smth
function t_sign (p1, p2, p3) {
    return (p1.attr("cx") - p3.attr("cx")) * (p2.attr("cy") - p3.attr("cy")) -
           (p2.attr("cx") - p3.attr("cx")) * (p1.attr("cy") - p3.attr("cy"));
}

// Return whether cand p is in the triangle t (array of 3 points)
function in_triangle(cand_p, t) {
    if (cand_p.data("point_i") == t[0].data("point_i") ||
        cand_p.data("point_i") == t[1].data("point_i") ||
        cand_p.data("point_i") == t[2].data("point_i")) {
        return false;
    }

    s1 = t_sign(cand_p, t[0], t[1]) < 0;
    s2 = t_sign(cand_p, t[1], t[2]) < 0;
    s3 = t_sign(cand_p, t[2], t[0]) < 0;

    return ((s1 == s2) && (s2 == s3));
}

function highlight_triangles(point) {
    var ts = point.data("triangles_inside");
    for (var i = 0; i < ts.length; i++) {
        var t = triangles[ts[i]];
        hide_underneath_lines(t);
        depth_extras.push(draw_path(t[0], t[1], "#000000", 1));
        depth_extras.push(draw_path(t[1], t[2], "#000000", 1));
        depth_extras.push(draw_path(t[0], t[2], "#000000", 1));
    }
}

function hide_underneath_lines(t) {
    i1 = t[0].data("point_i");
    i2 = t[1].data("point_i");
    i3 = t[2].data("point_i");
    tmp = [i1,i2,i3].sort(function(a,b){return (a-b);});
    depth_extras_hidden.push(cg_lines[tmp[2]][tmp[1]].hide());
    depth_extras_hidden.push(cg_lines[tmp[2]][tmp[0]].hide());
    depth_extras_hidden.push(cg_lines[tmp[1]][tmp[0]].hide());
}

///////////////
// Halfspace //
///////////////

function draw_halfspace_median() {
    var h_depths = [];
    if (points.length < 3) {
        return;
    }

    for (var i=0; i < points.length; i++) {
        h_depths.push(get_halfspace_depth(i));
    }
    med_point_i = index_of_max(h_depths)
    median_point = points[med_point_i];
    median.data("depth", h_depths[med_point_i]);
    median.animate({cx: median_point.attr("cx"), cy: median_point.attr("cy")}, 200, function(){allow_popovers = true;});
    median.data("my_line", median_point.data("my_line"));
    median.data("my_line_coords", median_point.data("my_line_coords"));
}

function get_halfspace_depth(point_i) {
    var lines = [];
    for (var i=0; i < points.length; i++) {
        if (i != point_i) {
            lines.push([{x:points[point_i].attr("cx"), y:points[point_i].attr("cy"), i: i}, {x:points[i].attr("cx")+15, y:points[i].attr("cy"), i: i}]);
            lines.push([{x:points[point_i].attr("cx"), y:points[point_i].attr("cy"), i: i}, {x:points[i].attr("cx")-15, y:points[i].attr("cy"), i: i}]);
            lines.push([{x:points[point_i].attr("cx"), y:points[point_i].attr("cy"), i: i}, {x:points[i].attr("cx"), y:points[i].attr("cy"), i: i}]);
            lines.push([{x:points[point_i].attr("cx"), y:points[point_i].attr("cy"), i: i}, {x:points[i].attr("cx"), y:points[i].attr("cy")+15, i: i}]);
            lines.push([{x:points[point_i].attr("cx"), y:points[point_i].attr("cy"), i: i}, {x:points[i].attr("cx"), y:points[i].attr("cy")-15, i: i}]);
        }
    }

    var min_depth = 1000000;
    var best_lines = [];

    for (var i=0; i < lines.length; i++) {
        var num_above = 0;
        var num_below = 0;
        var l1 = lines[i][0];
        var l2 = lines[i][1];
        for (var j=0; j < points.length; j++) {
            if (j != l1 && j != l2) {
                if(sign(l1, l2, {x:points[j].attr("cx"), y:points[j].attr("cy")}) > 0) {
                    num_above++;
                } else {
                    num_below++;
                }
            }            
        }
        var depth = Math.min(num_above, num_below);
        if (depth < min_depth) {
            best_lines = [lines[i]];
            min_depth = depth;
            best_line = i;
        } else if (depth == min_depth) {
            best_lines.push(lines[i]);
        }
    }
    best_line_dists = [];
    for (var i=0; i < best_lines.length; i++) {
        best_line_dists.push(point_line_dist({x:points[best_lines[i][0].i].attr("cx"), y:points[best_lines[i][1].i].attr("cy")}, best_lines[i][0], best_lines[i][1]));
    }
    best_line_i = index_of_max(best_line_dists);
    best_line = best_lines[best_line_i];

    new_line = draw_line(best_line[0], best_line[1], "#E0E0E0", 1);
    h_space_lines.push(new_line);
    points[point_i].data("h_depth", min_depth);
    points[point_i].data("my_line", new_line);
    points[point_i].data("my_line_coords", [best_line[0], best_line[1]]);
    return min_depth;
}

// lifted from stack overflow http://stackoverflow.com/questions/849211/shortest-distance-between-a-point-and-a-line-segment
function point_line_dist(p, l1, l2) {
    var len = dist2(l1, l2);
    if (len == 0) {
        return dist2(p, l1);
    }
    // project p onto the line 
    var t = ((p.x - l1.x) * (l2.x - l1.x) + (p.y - l1.y) * (l2.y - l1.y)) / len;
    t = Math.max(0, Math.min(1, t));
    return Math.sqrt(dist2(p, {x: l1.x + t * (l2.x - l1.x),
                     y: l1.y + t * (l2.y - l1.y)}));
}

function dist2(v, w) { 
    return (v.x - w.x)*(v.x - w.x) + (v.y - w.y)*(v.y - w.y);
}

function animate_halfspace(point) {
    depth_extras_hidden.push(point.data("my_line").hide());
    depth_extras.push(draw_line(point.data("my_line_coords")[0], point.data("my_line_coords")[1], "#000000", 2));
}

function sign(p1, p2, p3) {
    return (p1.x - p3.x) * (p2.y - p3.y) -
           (p2.x - p3.x) * (p1.y - p3.y);
}

////////////////////////
// Graphics Utilities //
////////////////////////

// Draw point on canvas at x y with given color and radius
function draw_point(x, y, color, radius, should_popover, deletable) {
    var new_circ = paper.circle(x, y, radius).attr({fill: color, stroke: "#FFFFFF"});
    if (should_popover) {
        $(new_circ.node).hoverIntent(
                    function() {
                        new_circ.animate({r:radius+2}, 100);
                        if (allow_popovers) {
                            x_on_paper = new_circ.attr("cx");
                            y_on_paper = new_circ.attr("cy");
                            $("#popover").html(get_depth_description(new_circ));
                            popover_w = $("#popover").outerWidth();
                            popover_h = $("#popover").outerHeight();

                            $("#popover").css("left", $('#plane').offset().left + x_on_paper-(popover_w/2))
                                         .css("top", $('#plane').offset().top+new_circ.attr("cy")-(15+popover_h));

                            $("#popover").fadeIn(50);
                        }
                    },
                    function(){
                        new_circ.animate({r:radius}, 50);
                        for (var i = 0; i < depth_extras.length; i++) {
                            depth_extras[i].remove();
                        }
                        for (var i = 0; i < depth_extras_hidden.length; i++) {
                            depth_extras_hidden[i].show();
                        }
                        
                        $("#popover").fadeOut(50);
                    }
                );
    }
    // todo: allow for point deletion
    // if (deletable) {
    //     $(new_circ.node).right
    // }
    new_circ.data("point_i", points.length);
    return new_circ;
}

function draw_path(p1, p2, color, stroke_width) {
    p = paper.path(["M", p1.attr("cx"), p1.attr("cy"), "L", p2.attr("cx"), p2.attr("cy")]);
    p.attr({stroke:color,"stroke-width":stroke_width});
    p.toBack();
    return p;
}

/////////////////////////
// Data/Math Utilities //
/////////////////////////

// Returns the median element in list of numbers l
function get_median(l) {
    l.sort(function(a,b){return a.data-b.data});
    len = l.length;
    if(len == 1) {
        return l[0].data;
    }
    if(l.length % 2 != 0) {
        return l[Math.floor(len/2)].data;
    } else {
        return (l[len/2-1].data+l[len/2].data)/2;
    }
}

// Returns the angle p1, p2, p3, centered at p2
function angle_between3(p1,p2,p3) {
    x1 = p1.attr("cx");
    y1 = p1.attr("cy");
    
    x2 = p2.attr("cx");
    y2 = p2.attr("cy");
    
    x3 = p3.attr("cx");
    y3 = p3.attr("cy");
    
    a = Math.sqrt((x1-x2)*(x1-x2)+(y1-y2)*(y1-y2));
    b = Math.sqrt((x2-x3)*(x2-x3)+(y2-y3)*(y2-y3));
    c = Math.sqrt((x1-x3)*(x1-x3)+(y1-y3)*(y1-y3));

    return Math.acos((a*a+b*b-c*c)/(2*a*b))
}

function dist(p1, p2) {
    return Math.round(Math.sqrt( (p1.attr("cx")-p2.attr("cx"))*(p1.attr("cx")-p2.attr("cx"))+(p1.attr("cy")-p2.attr("cy"))*(p1.attr("cy")-p2.attr("cy"))));
}

// lifted from https://www.topcoder.com/community/data-science/data-science-tutorials/geometry-concepts-line-intersection-and-its-applications/
function line_intersection(p1, p2, p3, p4) {
    x1 = p1.attr("cx");
    x2 = p2.attr("cx");
    x3 = p3.attr("cx");
    x4 = p4.attr("cx");

    y1 = p1.attr("cy");
    y2 = p2.attr("cy");
    y3 = p3.attr("cy");
    y4 = p4.attr("cy");

    a1 = y2-y1;
    b1 = x1-x2;
    c1 = a1*x1+b1*y1;

    a2 = y4-y3;
    b2 = x3-x4;
    c2 = a2*x3+b2*y3;

    det = a1*b2-a2*b1;

    inter_x = -1;
    inter_y = -1;

    if (det != 0) {
        inter_x = (b2*c1-b1*c2)/det;
        inter_y = (a1*c2-a2*c1)/det;
    }

    if (inter_x < Math.min(x1,x2,x3,x4) || inter_x > Math.max(x1,x2,x3,x4) || inter_y < Math.min(y1,y2,y3,y4) || inter_y > Math.max(y1,y2,y3,y4)) {
        inter_x = -1;
        inter_y = -1;
    }
    return {x: inter_x, y: inter_y};
}

// draw line through paper 
function draw_line(p1, p2, color, stroke_width) {
    x1 = p1.x;
    x2 = p2.x;
    y1 = p1.y;
    y2 = p2.y;

    pp1 = {x:x1, y:y1};
    pp2 = {x:x2, y:y2};

    slope = (y2-y1)/(x1-x2);

    sides = [[{x:0, y:0},{x:0, y: paper_h}], //l
             [{x:0, y:0},{x:paper_w, y: 0}], //t
             [{x:paper_w, y:paper_h},{x:paper_w, y: 0}], //r
             [{x:paper_w, y:paper_h},{x:0, y: paper_h}]] //b

    valid_points = [];

    for (var i = 0; i < 4; i++) {
        iter = line_intersection_2(pp1, pp2, sides[i][0], sides[i][1]);
        if (iter.x != -1) {
            valid_points.push(iter);
        }
    }
    
    p = paper.path(["M", valid_points[0].x, valid_points[0].y, "L", valid_points[1].x, valid_points[1].y]);
    p.attr({stroke:color,"stroke-width":stroke_width});
    p.toBack();
    return p;
}

//smh
function line_intersection_2(p1, p2, p3, p4) {
    x1 = p1.x;
    x2 = p2.x;
    x3 = p3.x;
    x4 = p4.x;

    y1 = p1.y;
    y2 = p2.y;
    y3 = p3.y;
    y4 = p4.y;

    a1 = y2-y1;
    b1 = x1-x2;
    c1 = a1*x1+b1*y1;

    a2 = y4-y3;
    b2 = x3-x4;
    c2 = a2*x3+b2*y3;

    det = a1*b2-a2*b1;

    inter_x = -1;
    inter_y = -1;

    if (det != 0) {
        inter_x = (b2*c1-b1*c2)/det;
        inter_y = (a1*c2-a2*c1)/det;
    }

    if (inter_x < Math.min(x1,x2,x3,x4) || inter_x > Math.max(x1,x2,x3,x4) || inter_y < Math.min(y1,y2,y3,y4) || inter_y > Math.max(y1,y2,y3,y4)) {
        inter_x = -1;
        inter_y = -1;
    }
    return {x: inter_x, y: inter_y};
}
