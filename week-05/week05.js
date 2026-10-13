function changeColor() {
  let num = Math.floor(Math.random() * 6);

  if (num == 0) {

    document.body.style.backgroundColor = "#ffd1eb"; 
  } else if (num == 1) {

    document.body.style.backgroundColor = "#f1ffb4"; 
  } else if (num == 2) {

    document.body.style.backgroundColor = "#fff5cd"; 
  } else if (num == 3) {

    document.body.style.backgroundColor = "#ceffce"; 
  } else if (num == 4) {

    document.body.style.backgroundColor = "#b5d9ff"; 
  } else if (num == 5) {

    document.body.style.backgroundColor = "#dad1ff"; 
  }
}

changeColor();
setInterval(changeColor, 3500);
