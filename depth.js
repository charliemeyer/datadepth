//////////////////////
// Global Resources //
//////////////////////

var canvas = document.getElementById("plane");
var ctx = canvas.getContext("2d");
var point_size = 3;
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
    points = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    draw_point(canvas.width / 2, canvas.height / 2, "#F44336", 5);
}

// Add the point where they clicked, recompute median
function handle_click(e) {
    var rect = canvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    points.push([x, y]);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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
    draw_point(mean_x, mean_y, "#388E3C", 5);
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
    draw_point(med_x, med_y, "#F44336", 5);
}


///////////////
// Utilities //
///////////////

// Returns the median element in list of numbers l
function median(l) {
    l.sort(function(a,b){return a-b});
    console.log(l);
    len = l.length
    if(len == 1) {
        return l[0];
    }
    if(l.length % 2 != 0) {
        console.log(len/2);
        return l[Math.floor(len/2)];
    } else {
        return (l[len/2]+l[len/2+1])/2;
    }
}

// Draw point on canvas at x y with given color and radius
function draw_point(x, y, color, radius) {
    ctx.fillStyle = color;
    ctx.beginPath(); //Start path
    ctx.arc(x, y, radius, 0, Math.PI * 2, true); 
    ctx.fill();
    return [x,y];
}

// Debug output for a point
function print_point(x,y) {
    alert("point at (" + x +", " + y + ")");
}
