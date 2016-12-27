//////////////////////
// Global Resources //
//////////////////////

var paper_w = $("#plane").width();
var paper_h = $("#plane").height();
var plane = document.getElementById("plane");
$("#popover").hide();

var paper = Raphael(plane, paper_w, paper_h);
// paper.rect(0, 0, 800, 600, 10).attr({fill: "#F5F5F5", stroke: "none"});
var point_size = 6;
var median_size = 8;
var proj_point_size = 4;
var proj_median_size = 6;
var points = [];
var point_color = "#212121";
var median_type = parseInt($("#medianpicker").val());
var last_median_type = -1;
var median;

// median of medians crap
var bogus_med_med_points = [];
var bogus_medx;
var bogus_medy;

// nested hulls crap
var hulls = [];
var hull_lines = [];
var hull_colors = ["#EF5350","#F44336","#E53935","#D32F2F","#C62828","#B71C1C"];


// simplicial median crap
var cg_lines = [];
var triangles = [];

// halfaspace crap
var h_space_lines = [];

// Register all the event handlers
$(document).ready(function() {
    median = draw_point(paper_w/2, paper_h/2, "#F44336", 7, true).data("median", true);
    $("#plane").click(handle_click);
    $("#clear_points").click(clear_points);
    $("#medianpicker").change(function(){
        median_type = parseInt($(this).val());
        draw_median();
    });
    $( window ).resize(function() {
        old_w = paper_w;
        old_h = paper_h;
        paper_w = $("#plane").width();
        paper_h = $("#plane").height();
        paper.setSize(paper_w, paper_h);
        cleanup();
        x_scale = paper_w/old_w;
        y_scale = paper_h/old_h;
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

////////////////////
// Event Handlers //
////////////////////

// Clear the points
function clear_points() {
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
                    median = draw_point(med_x, med_y, "#F44336", 7, true).data("median", true);
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

    new_point = draw_point(x, y, point_color, point_size, true);
    points.push(new_point);

    draw_median();
}

// Draws the median of points based on currently chosen definition
function draw_median() {
    // really high quality modular stuff here man
    if (points.length == 0) {
        median.animate({cx:paper_w/2, cy:paper_h/2}, 200);
        return;
    }

    if (median_type != last_median_type || median_type == 2 || median_type == 4) {
        cleanup();
    }

    median.toFront();
    switch(median_type) {
        case 0: 
            draw_mean_point()
            break;
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

function get_depth_description(point) {
    var median_descs = ["Mean", "Coordinate-wise median", "\"Nested hull\" median", "Simplicial median", "Halfspace median"]

    if (point.data("median")) {
        return median_descs[median_type] + " of the data";
    }
    switch(median_type) {
        case 0: 
            return dist(point, median) + " units away from mean";
            break;
        case 1:
            return "x rank: " + point.data("x_rank") +"/" + points.length + "<br>" +
                   "y rank: " + point.data("y_rank") +"/" + points.length;
            break;
        case 2:
            if (point.data("hull_i") == 100000) {
                return "Inside innermost hull";
            } else {
                return "On nested hull: " + point.data("hull_i");
            }
            break;
        case 3:
            return "Simplicial depth: " + point.data("simp_depth");
            break;
        case 4:
            return "Halfspace depth:" + point.data("h_depth");
            break;    
        default:
            alert("bad option for median type used " + median_type);
    }
}


// Basically just kill everything that isn't just the points
function cleanup() {
    for (var i = 0; i < points.length; i++) {  
        points[i].animate({fill:"#000"});
        points[i].removeData();
    }

    // cleanup med_x med_y
    for(var i = 0; i < bogus_med_med_points.length; i++) {
        bogus_med_med_points[i].remove();
    }

    bogus_med_med_points = [];
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
        cg_lines[i].remove();
    }
    cg_lines = [];
    triangles = [];

    for(var i = 0; i < h_space_lines.length; i++) {
        h_space_lines[i].remove();
    }
    h_space_lines = [];
}

////////////////////////////////////// 
// Different median implementations //
//////////////////////////////////////

function draw_mean_point() {
    var mean_x = 0;
    var mean_y = 0;
    var num_points = points.length;
    for (var i = 0; i < num_points; i++) {
        mean_x += points[i].attr("cx");
        mean_y += points[i].attr("cy");
    }
    mean_x = mean_x / num_points;
    mean_y = mean_y / num_points;
    median.animate({cx: mean_x, cy: mean_y}, 200);
}

function draw_median_x_y() {
    var xs = []
    var ys = []

    var num_points = points.length;
    for (var i = 0; i < num_points; i++) {
        xs.push({data: points[i].attr("cx"), i:i});
        ys.push({data: points[i].attr("cy"), i:i});
        if (!points[i].data("bogus_drawn")) {
            x_bog = draw_point(points[i].attr("cx"), points[i].attr("cy"), "#9E9E9E", proj_point_size, false);
            y_bog = draw_point(points[i].attr("cx"), points[i].attr("cy"), "#9E9E9E", proj_point_size, false);
            bogus_med_med_points.push(x_bog);
            bogus_med_med_points.push(y_bog);
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
        bogus_medx = draw_point(proj_median_size, paper_h-(proj_median_size), "#EF5350", proj_median_size, false);
        bogus_medy = draw_point(proj_median_size, paper_h-(proj_median_size), "#EF5350", proj_median_size, false);
    }
    bogus_medx.animate({cx:med_x});
    bogus_medx.toFront();
    bogus_medy.animate({cy:med_y});
    bogus_medy.toFront();
    median.animate({cx: med_x, cy: med_y}, 200);
}


function draw_hull_median() {
    hulls = []
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
    hull = [new_hull];    

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
    
    median.animate({cx: med_x / num_non_hull, cy: med_y / num_non_hull}, 200);
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
    first.animate({fill:"#3D5AFE"},200);

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
    first.animate({fill:"#3D5AFE"},200);
    
    // now we get the general case
    next_i = -1

    while (next_i != this_hull[0]) {
        angles = [];

        first_hull_i = this_hull[this_hull.length-2];
        second_hull_i = this_hull[this_hull.length-1];
        
        hull_lines.push(draw_path(points[first_hull_i], points[second_hull_i], hull_colors[hull_i%hull_colors.length], 2));

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
        points[next_i].animate({fill:"#3D5AFE"},200);
    }

    // close the hull
    hull_lines.push(draw_path(points[this_hull[0]], points[this_hull[this_hull.length-1]], hull_colors[hull_i%hull_colors.length], 2));

    return this_hull;
}

// DANGEROUS: this is now in parallel with the state of the points YIKES
// exclude that index if it happens to be associated with a point with valid data under the key
// given by exclude in its data dict
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

// three cheers for n^4 time holy heack baby
function draw_simplicial_median() {
    triangles = [];
    for(var i = 0; i < points.length; i++) {
        if (points[i].data("simp_depth") !== undefined) {}
        for(var j = i; j < points.length; j++){
            if (j != i) {
                for(var k = j; k < points.length; k++){
                    if (k != i && k != j) {
                        triangles.push([points[i], points[j], points[k]]);
                    }
                }
                cg_lines.push(draw_path(points[i], points[j], "#000000", 1));
            }
        }
    }

    simp_depths = [];

    for(var i = 0; i < points.length; i++) {
        points_inside = 0;
        for (var j = 0; j < triangles.length; j++) {
            if (in_triangle(points[i], triangles[j])) {
                points_inside += 1;
            }
        }
        simp_depths.push(points_inside);
        points[i].data("simp_depth", points_inside);
    }

    median_point = points[index_of_max(simp_depths)];

    median.animate({cx: median_point.attr("cx"), cy: median_point.attr("cy")}, 200);
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
function sign (p1, p2, p3) {
    return (p1.attr("cx") - p3.attr("cx")) * (p2.attr("cy") - p3.attr("cy")) -
           (p2.attr("cx") - p3.attr("cx")) * (p1.attr("cy") - p3.attr("cy"));
}

// Return whether cand p is in the triangle t (array of 3 points)
function in_triangle(cand_p, t) {
    s1 = sign(cand_p, t[0], t[1]) < 0;
    s2 = sign(cand_p, t[1], t[2]) < 0;
    s3 = sign(cand_p, t[2], t[0]) < 0;

    return ((s1 == s2) && (s2 == s3));
}

function draw_halfspace_median() {
    var h_depths = [];
    if (points.length < 3) {
        return;
    }

    for (var i=0; i < points.length; i++) {
        h_depths.push(get_halfspace_depth(i));
    }
    median_point = points[index_of_max(h_depths)];
    median.animate({cx: median_point.attr("cx"), cy: median_point.attr("cy")}, 200);
}

function get_halfspace_depth(point_i) {
    var lines = [];
    for (var i=0; i < points.length; i++) {
        if (i != point_i) {
            lines.push([point_i, i]);
        }
    }

    var best_line = 0;
    var min_depth = 1000000;

    for (var i=0; i < lines.length; i++) {
        var num_above = 0;
        var num_below = 0;
        var l1 = lines[i][0];
        var l2 = lines[i][1];
        for (var j=0; j < points.length; j++) {
            if (j != l1 && j != l2) {
                if(sign(points[l1], points[l2], points[j]) > 0) {
                    num_above++;
                } else {
                    num_below++;
                }
            }            
        }
        var depth = Math.min(num_above, num_below);
        if (depth < min_depth) {
            min_depth = depth;
            best_line = i;
        }
    }

    h_space_lines.push(draw_path(points[lines[best_line][0]], points[lines[best_line][1]], "#000000", 1));
    points[point_i].data("h_depth", min_depth);
    return min_depth;
}



///////////////
// Utilities //
///////////////

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

// Draw point on canvas at x y with given color and radius
function draw_point(x, y, color, radius, should_popover) {
    var new_circ = paper.circle(x, y, radius).attr({fill: color, stroke: "#FFFFFF"});
    if (should_popover) {
        $(new_circ.node).hoverIntent(
                    function() {
                        new_circ.animate({r:radius+2}, 100);
                        x_on_paper = new_circ.attr("cx");
                        y_on_paper = new_circ.attr("cy");
                        $("#popover").html(get_depth_description(new_circ));
                        popover_w = $("#popover").outerWidth();
                        popover_h = $("#popover").outerHeight();

                        // todo: maybe care about left and right edges but that seems a bit much
                        // if (y_on_paper > paper_h / 2) {
                        $("#popover").css("left", $('#plane').offset().left + x_on_paper-(popover_w/2))
                                     .css("top", $('#plane').offset().top+new_circ.attr("cy")-(15+popover_h));
                        // } else {
                        // $("#popover").css("left", $('#plane').offset().left + x_on_paper-(popover_w/2))
                                     // .css("top", $('#plane').offset().top+new_circ.attr("cy")+15);
                        // }


                        $("#popover").fadeIn(100);
                    },
                    function(){
                        new_circ.animate({r:radius}, 100)
                        $("#popover").fadeOut(100);
                    }
                );
    }

    return new_circ;
}

// returns the angle p1, p2, p3, centered at p2
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

function draw_path(p1, p2, color, stroke_width) {
    p =paper.path(["M", p1.attr("cx"), p1.attr("cy"), "L", p2.attr("cx"), p2.attr("cy")]);
    p.attr({stroke:color,"stroke-width":stroke_width});
    p.toBack();
    return p;
}

function dist(p1, p2) {
    return Math.round(Math.sqrt((p1.attr("cx")-p2.attr("cx"))**2+(p1.attr("cy")-p2.attr("cy"))**2));
}

function get_rank(axis) {

}

// work harder on this
// function draw_line(p1, p2, color, stroke_width) {
//     x1 = p1.attr("cx");
//     x2 = p2.attr("cx");
//     y1 = p1.attr("cy");
//     y2 = p2.attr("cy");

//     slope = (y2-y1)/(x1-x2);
//     if (Math.abs(slope) > paper_h/paper_w) {
//         line_start = 
//         line_end = 
//     } else {
//         line_start = 
//         line_end =
//     }

//     return draw_path(line_start, line_end, color, stroke_width);
// }


