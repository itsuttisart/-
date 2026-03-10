const SHEET_API_BASE = "https://script.google.com/macros/s/REPLACE_WITH_DEPLOYED_WEBAPP/exec";

const storageKeys = {
  rememberedUser: "schoolflow.rememberedUser",
  pinHash: "schoolflow.pinHash",
};

const state = {
  user: null,
  activeMenu: "grades",
  data: {
    grades: [],
    attendance: [],
    behavior: [],
    teaching: [],
    students: [],
    staff: [],
    checkin: [],
    settings: [],
  },
};

const menus = [
  { id: "grades", label: "ผลการเรียน" },
  { id: "attendance", label: "เช็คเข้าเรียน" },
  { id: "behavior", label: "ความประพฤติ" },
  { id: "teaching", label: "วิชา/ห้องที่สอน" },
  { id: "students", label: "ข้อมูลนักเรียน" },
  { id: "staff", label: "ข้อมูลบุคลากร" },
  { id: "checkin", label: "ลงเวลาเข้า-ออกงาน" },
  { id: "settings", label: "ตั้งค่าระบบ" },
];

const viewMap = {
  grades: {
    title: "แจ้งผลการเรียนแยกตามปีการศึกษาและเทอม",
    fields: ["studentId", "fullName", "year", "semester", "course", "score", "grade"],
  },
  attendance: {
    title: "เช็คเข้าเรียนรายวิชา",
    fields: ["date", "course", "room", "studentId", "fullName", "status", "remark"],
  },
  behavior: {
    title: "บันทึกความประพฤติ",
    fields: ["date", "studentId", "fullName", "category", "detail", "point"],
  },
  teaching: {
    title: "จัดการวิชาที่สอนและห้องที่สอน",
    fields: ["teacherId", "teacherName", "course", "room", "level", "term"],
  },
  students: {
    title: "จัดการข้อมูลนักเรียน",
    fields: ["studentId", "prefix", "fullName", "classRoom", "guardian", "phone"],
  },
  staff: {
    title: "จัดการข้อมูลบุคลากร",
    fields: ["staffId", "fullName", "position", "department", "phone", "email"],
  },
  checkin: {
    title: "เช็คอินลงเวลาเข้า-ออกงานบุคลากร",
    fields: ["date", "staffId", "fullName", "checkIn", "checkOut", "status"],
  },
  settings: {
    title: "ตั้งค่าผู้ใช้งานทั่วไปและผู้ดูแลระบบ",
    fields: ["username", "password", "role", "accessMenus", "status"],
  },
};

document.addEventListener("DOMContentLoaded", init);

function init() {
  const rememberedUser = localStorage.getItem(storageKeys.rememberedUser);
  const pinHash = localStorage.getItem(storageKeys.pinHash);

  if (rememberedUser && pinHash) {
    showPinForm(rememberedUser);
  } else {
    showLoginForm();
  }

  document.getElementById("login-form").addEventListener("submit", handleLogin);
  document.getElementById("pin-form").addEventListener("submit", handlePinLogin);
  document.getElementById("switch-account").addEventListener("click", clearRememberedLogin);
  document.getElementById("logout-btn").addEventListener("click", logout);
  document.getElementById("sync-btn").addEventListener("click", syncAllMenus);
}

function showLoginForm() {
  document.getElementById("auth-view").classList.remove("hidden");
  document.getElementById("main-view").classList.add("hidden");
  document.getElementById("login-form").classList.remove("hidden");
  document.getElementById("pin-form").classList.add("hidden");
}

function showPinForm(username) {
  document.getElementById("auth-view").classList.remove("hidden");
  document.getElementById("main-view").classList.add("hidden");
  document.getElementById("login-form").classList.add("hidden");
  document.getElementById("pin-form").classList.remove("hidden");
  document.getElementById("pin-user").textContent = `ผู้ใช้งาน: ${username}`;
}

async function handleLogin(event) {
  event.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  if (!username || !password) {
    return alert("กรุณากรอกข้อมูลให้ครบ");
  }

  const auth = await callSheetsApi("auth", { username, password });
  if (!auth.ok) {
    return alert(auth.message || "เข้าสู่ระบบไม่สำเร็จ");
  }

  const pin = prompt("ตั้งค่า PIN สำหรับเข้าใช้ครั้งถัดไป (4-6 หลัก)");
  if (!pin || !/^\d{4,6}$/.test(pin)) {
    return alert("PIN ต้องเป็นตัวเลข 4-6 หลัก");
  }

  localStorage.setItem(storageKeys.rememberedUser, username);
  localStorage.setItem(storageKeys.pinHash, simpleHash(pin));
  state.user = { username, role: auth.role || "user" };
  enterDashboard();
}

function handlePinLogin(event) {
  event.preventDefault();
  const pin = document.getElementById("pin").value;
  const storedHash = localStorage.getItem(storageKeys.pinHash);
  const username = localStorage.getItem(storageKeys.rememberedUser);

  if (simpleHash(pin) !== storedHash) {
    return alert("PIN ไม่ถูกต้อง");
  }

  state.user = { username, role: "user" };
  enterDashboard();
}

function clearRememberedLogin() {
  localStorage.removeItem(storageKeys.rememberedUser);
  localStorage.removeItem(storageKeys.pinHash);
  showLoginForm();
}

function logout() {
  state.user = null;
  document.getElementById("pin").value = "";
  const rememberedUser = localStorage.getItem(storageKeys.rememberedUser);
  rememberedUser ? showPinForm(rememberedUser) : showLoginForm();
}

function enterDashboard() {
  document.getElementById("auth-view").classList.add("hidden");
  document.getElementById("main-view").classList.remove("hidden");
  document.getElementById("welcome-text").textContent = `ยินดีต้อนรับ ${state.user.username}`;
  renderTabs();
  renderActiveMenu();
  syncAllMenus();
}

function renderTabs() {
  const tabs = document.getElementById("menu-tabs");
  tabs.innerHTML = "";

  menus.forEach((menu) => {
    const button = document.createElement("button");
    button.className = `tab-btn ${state.activeMenu === menu.id ? "active" : ""}`;
    button.textContent = menu.label;
    button.addEventListener("click", () => {
      state.activeMenu = menu.id;
      renderTabs();
      renderActiveMenu();
    });
    tabs.appendChild(button);
  });
}

function renderActiveMenu() {
  const config = viewMap[state.activeMenu];
  const content = document.getElementById("menu-content");
  content.innerHTML = `
    <h3>${config.title}</h3>
    <p class="notice">ข้อมูลเมนูนี้เชื่อมกับ Google Sheets ชีตชื่อ <strong>${state.activeMenu}</strong></p>
    <div class="grid" id="form-grid"></div>
    <div class="actions">
      <button id="save-row-btn">บันทึกข้อมูล</button>
      <button class="secondary" id="reload-row-btn">โหลดใหม่</button>
    </div>
    <div id="table-wrapper"></div>
  `;

  const grid = document.getElementById("form-grid");
  config.fields.forEach((field) => {
    const label = document.createElement("label");
    label.innerHTML = `${field}<input id="field-${field}" />`;
    grid.appendChild(label);
  });

  document.getElementById("save-row-btn").addEventListener("click", () => saveCurrentForm(config.fields));
  document.getElementById("reload-row-btn").addEventListener("click", () => loadMenuData(state.activeMenu));
  renderTable(state.activeMenu, config.fields);
}

function renderTable(menu, fields) {
  const tableWrapper = document.getElementById("table-wrapper");
  const template = document.getElementById("table-template").content.cloneNode(true);
  const thead = template.querySelector("thead");
  const tbody = template.querySelector("tbody");

  thead.innerHTML = `<tr>${fields.map((field) => `<th>${field}</th>`).join("")}</tr>`;
  const rows = state.data[menu] || [];

  tbody.innerHTML = rows
    .map(
      (row) =>
        `<tr>${fields.map((field) => `<td>${row[field] ?? ""}</td>`).join("")}</tr>`,
    )
    .join("");

  tableWrapper.innerHTML = "";
  tableWrapper.appendChild(template);
}

async function saveCurrentForm(fields) {
  const payload = {};
  fields.forEach((field) => {
    payload[field] = document.getElementById(`field-${field}`).value;
  });

  const result = await callSheetsApi("append", {
    sheet: state.activeMenu,
    values: payload,
  });

  if (!result.ok) {
    return alert(result.message || "บันทึกข้อมูลไม่สำเร็จ");
  }

  alert("บันทึกข้อมูลสำเร็จ");
  loadMenuData(state.activeMenu);
}

async function syncAllMenus() {
  for (const menu of menus) {
    await loadMenuData(menu.id, false);
  }
  renderActiveMenu();
}

async function loadMenuData(menu, showAlert = true) {
  const result = await callSheetsApi("list", { sheet: menu });
  if (!result.ok) {
    if (showAlert) alert(result.message || `ไม่สามารถโหลดข้อมูล ${menu}`);
    return;
  }

  state.data[menu] = result.rows || [];
  if (menu === state.activeMenu) {
    renderTable(menu, viewMap[menu].fields);
  }
}

async function callSheetsApi(action, body) {
  try {
    const response = await fetch(SHEET_API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    });

    return await response.json();
  } catch (error) {
    return {
      ok: false,
      message: `เชื่อมต่อ Google Sheets ไม่สำเร็จ: ${error.message}`,
    };
  }
}

function simpleHash(value) {
  return btoa(unescape(encodeURIComponent(value))).split("").reverse().join("");
}
