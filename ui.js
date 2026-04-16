const drawerOpenBtn = document.getElementById("drawerOpenBtn");
const drawerCloseBtn = document.getElementById("drawerCloseBtn");
const sideDrawer = document.getElementById("sideDrawer");
const drawerOverlay = document.getElementById("drawerOverlay");

setupDrawer();

function setupDrawer() {
  if (!drawerOpenBtn || !drawerCloseBtn || !sideDrawer || !drawerOverlay) return;

  drawerOpenBtn.addEventListener("click", openDrawer);
  drawerCloseBtn.addEventListener("click", closeDrawer);
  drawerOverlay.addEventListener("click", closeDrawer);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDrawer();
    }
  });
}

function openDrawer() {
  sideDrawer.classList.add("show");
  drawerOverlay.classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeDrawer() {
  sideDrawer.classList.remove("show");
  drawerOverlay.classList.remove("show");
  document.body.style.overflow = "";
}
