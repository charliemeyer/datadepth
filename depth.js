//////////////////////
// Global Resources //
//////////////////////

var paper_w = $("#plane").height();
var paper_h = $("#plane").width();
var plane = document.getElementById("plane");

var paper = Raphael(plane, 800, 600);
paper.rect(0, 0, 800, 600, 10).attr({fill: "#fff", stroke: "none"});
var point_size = 3;
var median_size = 5;
var points = [];
var point_color = "#212121";
var median_type = parseInt($("#medianpicker").val());

// Register all the event handlers
$(document).ready(function() {
    clear_points();
    $("#plane").click(handle_click);
    $("#clear_points").click(clear_points);
    $("#medianpicker").change(function(){
        median_type = parseInt($(this).val());
        draw_median();
    });
});

////////////////////
// Event Handlers //
////////////////////

// Clear the points
function clear_points() {
    paper.clear();
    draw_point(paper_w/2, paper_h/2, "#F44336", 25);
}

// Add the point where they clicked, recompute median
function handle_click(e) {
    var rect = plane.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    points.push([x, y]);
    paper.clear();
    for (var i = 0; i < points.length; i++) {
        draw_point(points[i][0], points[i][1], point_color, point_size);
    }
    draw_median();
}

// Draws the median of points based on currently chosen definition
function draw_median() {
    switch(median_type) {
        case 0: 
            draw_mean_point()
            break;
        case 1:
            draw_median_x_y();
            break;
        default:
            alert("bad option for median type used " + median_type);
    }
}

////////////////////////////////////// 
// Different median implementations //
//////////////////////////////////////

function draw_mean_point() {
    var mean_x = 0;
    var mean_y = 0;
    var num_points = points.length;
    for (var i = 0; i < num_points; i++) {
        mean_x += points[i][0];
        mean_y += points[i][1];
    }
    mean_x = mean_x / num_points;
    mean_y = mean_y / num_points;
    draw_point(mean_x, mean_y, "#388E3C", median_size);
}

function draw_median_x_y() {
    xs = []
    ys = []

    var num_points = points.length;
    for (var i = 0; i < num_points; i++) {
        xs.push(points[i][0]);
        ys.push(points[i][1]);
    }

    med_x = median(xs);
    med_y = median(ys);
    draw_point(med_x, med_y, "#F44336", median_size);
}


///////////////
// Utilities //
///////////////

// Returns the median element in list of numbers l
function median(l) {
    l.sort(function(a,b){return a-b});
    len = l.length
    if(len == 1) {
        return l[0];
    }
    if(l.length % 2 != 0) {
        return l[Math.floor(len/2)];
    } else {
        return (l[len/2]+l[len/2+1])/2;
    }
}

// Draw point on canvas at x y with given color and radius
function draw_point(x, y, color, radius) {
    print_point(x,y);
    new_circ = paper.circle(x, y, radius).attr({fill: color, stroke: "#FFFFFF"});
    new_circ.hover(function(){
        print_point(new_circ.attr("x"),new_circ.attr("y"));
    });
    return new_circ;
}

// Debug output for a point
function print_point(x,y) {
    console.log("point at (" + x +", " + y + ")");
}
