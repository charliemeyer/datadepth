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
    var mean_x = 0;
    var mean_y = 0;
    var num_points = points.length;

    xs = []
    ys = []

    for (var i = 0; i < num_points; i++) {
        mean_x += points[i][0];
        mean_y += points[i][1];
        xs.push(points[i][0]);
        ys.push(points[i][1]);
    }

    med_x = median(xs);
    med_y = median(ys);

    mean_x = mean_x / num_points;
    mean_y = mean_y / num_points;

    // step 2: draw that median
    // alert("median");
    // print_point(med_x,med_y);
    draw_point(med_x, med_y, "#F44336", 5);
    // alert("mean");
    // print_point(mean_x,mean_y);
    draw_point(mean_x, mean_y, "#388E3C", 5);
}

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

function print_point(x,y) {
    alert("point at (" + x +", " + y + ")");
}