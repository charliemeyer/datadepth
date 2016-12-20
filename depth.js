var canvas = document.getElementById("plane");
var ctx = canvas.getContext("2d");
var point_size = 3;
var points = [];
var point_color = "#212121";

$(document).ready(function(){
    clear_points();
    $("#plane").click(handle_click);
    $("#clear_points").click(clear_points);
});

function clear_points() {
    points = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    draw_point(canvas.width / 2, canvas.height / 2, "#F44336", 5);
}

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

function draw_point(x, y, color, radius) {
    // alert("got a point at " + x + " " + y);
    ctx.fillStyle = color;
    ctx.beginPath(); //Start path
    ctx.arc(x, y, radius, 0, Math.PI * 2, true); 
    ctx.fill();
    return [x,y];
}

// lmao just gonna get the avg tbh
function draw_median() {
    // step 1: get that median
    var med_x = 0;
    var med_y = 0;
    var num_points = points.length;

    for (var i = 0; i < num_points; i++) {
        med_x += points[i][0];
        med_y += points[i][1];
    }

    med_x = med_x / num_points;
    med_y = med_y / num_points;

    // step 2: draw that median
    draw_point(med_x, med_y, "#F44336", 5);
}
