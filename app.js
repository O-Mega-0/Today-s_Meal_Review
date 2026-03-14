const firebaseConfig = {
  apiKey: "AIzaSyBEyWpxDCxGLohqW2yyu7IaRjT-FvoOf3E",
  authDomain: "webapp-project-fd0d7.firebaseapp.com",
  projectId: "webapp-project-fd0d7",
  storageBucket: "webapp-project-fd0d7.firebasestorage.app",
  messagingSenderId: "804457776339",
  appId: "1:804457776339:web:c3dcc8045b0183c1740026",
  measurementId: "G-HE4M2LM7PF"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const ratedMenus = new Set();
const click = new Audio("https://raw.githubusercontent.com/o-mega-0/Today-s_Meal_Reavies/main/Effect");
click.volume = 1.0;

const meals = {
  13: ["기장밥", "꽃게된장국", "고추장제육볶음", "달걀찜", "추로스스낵", "겨울초부추겉절이", "사과감자샐러드", "김치", "액상요구르트"]
};

const menuListDiv = document.getElementById("menuList");
const messageP = document.getElementById("menuMessage");
const weeklyEl = document.getElementById("weeklyAverage");
const monthlyEl = document.getElementById("monthlyAverage");
const weeklyBestEl = document.getElementById("weeklyBest");
const monthlyBestEl = document.getElementById("monthlyBest");
const holidayMessageEl = document.getElementById("holidayMessage");

function getSeoulNow(){ return new Date(new Date().toLocaleString("en-US",{timeZone:"Asia/Seoul"})); }
function formatDate(d){ const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,"0"); const dd=String(d.getDate()).padStart(2,"0"); return `${y}-${m}-${dd}`; }
function getTodayStr(){ return formatDate(getSeoulNow()); }
function getDayOfMonth(){ return getSeoulNow().getDate(); }
function getLocalUserId(){ let id = localStorage.getItem("local_viewer_id"); if(!id){ id="local_"+Math.random().toString(36).substring(2,12); localStorage.setItem("local_viewer_id",id); } return id; }
function buildLocalRatedKey(userId,dateStr,menu){ return `${userId}_rated_${dateStr}_${encodeURIComponent(menu)}`; }
function scanLocalStorageRatedForDate(dateStr){
  ratedMenus.clear();
  const user = getLocalUserId();
  for(let i=0;i<localStorage.length;i++){
    const k = localStorage.key(i);
    if(!k) continue;
    const prefix = `${user}_rated_${dateStr}_`;
    if(k.startsWith(prefix)){
      const menu = decodeURIComponent(k.substring(prefix.length));
      if(menu) ratedMenus.add(menu);
    }
  }
}
function isBeforeLunchNow(){
  const now = getSeoulNow();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  return hours<12||(hours===12&&minutes<30);
}
function setCardColor(card,score){
  if(!card) return;
  if(score<=2) card.style.background="#ffb3b3";
  else if(score===3) card.style.background="#fff6b3";
  else card.style.background="#b9f7b3";
}
function computeWeeklyMonthlyAverages(){
  const seoulNow=getSeoulNow();
  const currentDay=seoulNow.getDay();
  const weekStart=new Date(seoulNow);
  const diffToMonday=currentDay===0?-6:1-currentDay;
  weekStart.setDate(seoulNow.getDate()+diffToMonday);
  const weekStartStr=formatDate(weekStart);
  const todayStr=formatDate(seoulNow);
  const monthStart=todayStr.slice(0,7)+"-01";
  db.collection("ratings").where("date",">=",weekStartStr).where("date","<=",todayStr).get().then(snapshot=>{
    let sum=0,count=0,menuScores={};
    snapshot.forEach(doc=>{
      const v=Number(doc.data().score);
      if(!isNaN(v)){
        sum+=v; count++;
        if(!menuScores[doc.data().menu]) menuScores[doc.data().menu]={sum:0,count:0};
        menuScores[doc.data().menu].sum+=v;
        menuScores[doc.data().menu].count++;
      }
    });
    const avg = count ? (sum/count).toFixed(1) : "아직 없음. 첫 번째 평점을 남겨보세요!";
    if(weeklyEl) weeklyEl.textContent=`📊 이번 주 평균: ${avg} (평가 ${count}개)`;
    let bestMenu="없음",bestScore=0;
    Object.keys(menuScores).forEach(m=>{ const s=menuScores[m].sum/menuScores[m].count; if(s>bestScore){bestScore=s;bestMenu=m;} });
    if(weeklyBestEl) weeklyBestEl.textContent=`🏆 이번 주 인기 1등: ${bestMenu} (${bestScore.toFixed(1)}) 🏆`;
  });
  db.collection("ratings").where("date",">=",monthStart).where("date","<=",todayStr).get().then(snapshot=>{
    let sum=0,count=0,menuScores={};
    snapshot.forEach(doc=>{
      const v=Number(doc.data().score);
      if(!isNaN(v)){ sum+=v; count++; if(!menuScores[doc.data().menu]) menuScores[doc.data().menu]={sum:0,count:0}; menuScores[doc.data().menu].sum+=v; menuScores[doc.data().menu].count++; }
    });
    const avg = count ? (sum/count).toFixed(1) : "아직 없음. 첫 번째 평점을 남겨보세요!";
    if(monthlyEl) monthlyEl.textContent=`📊 이번 달 평균: ${avg} (평가 ${count}개)`;
    let bestMenu="없음",bestScore=0;
    Object.keys(menuScores).forEach(m=>{ const s=menuScores[m].sum/menuScores[m].count; if(s>bestScore){bestScore=s;bestMenu=m;} });
    if(monthlyBestEl) monthlyBestEl.textContent=`🏆 이번 달 인기 1등: ${bestMenu} (${bestScore.toFixed(1)}) 🏆`;
  });
}
function createCard(menu,avg,count,isRated,dateStr){
  const disabledVisual = isBeforeLunchNow();
  const card = document.createElement("div");
  const title = document.createElement("b");
  title.textContent = menu;
  const info = document.createElement("div");
  info.textContent = typeof avg==="string"?`평균 평점 : ${avg}`:`평균 평점 : ${avg} (평가 ${count}개)`;
  const buttonsDiv = document.createElement("div");
  for(let i=1;i<=5;i++){
    const btn=document.createElement("button");
    btn.textContent="⭐".repeat(i);
    btn.style.opacity = disabledVisual ? 0.5 : (isRated ? 0.6 : 1);
    btn.dataset.menu=menu;
    btn.dataset.score=String(i);
    btn.dataset.date=dateStr;
    btn.addEventListener("click",e=>{
      if(isBeforeLunchNow()){ alert("아직 점심시간이 되지 않았습니다."); return; }
      const m=e.currentTarget.dataset.menu;
      const s=parseInt(e.currentTarget.dataset.score,10);
      const d=e.currentTarget.dataset.date;
      if(ratedMenus.has(m)){ alert("이 메뉴는 이미 오늘 평가하셨습니다."); return; }
      submitRating(m,s,d,buttonsDiv,info);
    });
    buttonsDiv.appendChild(btn);
  }
  card.appendChild(title);
  card.appendChild(document.createElement("br"));
  card.appendChild(info);
  card.appendChild(buttonsDiv);
  return card;
}
function loadTodayMenu(){
  const dateStr=getTodayStr();
  const day=getDayOfMonth();
  scanLocalStorageRatedForDate(dateStr);
  computeWeeklyMonthlyAverages();
  if(!meals[day]){
    if(messageP){ messageP.style.color="red"; messageP.style.textAlign="center"; messageP.style.fontWeight="700"; messageP.style.fontSize="1.2em"; messageP.textContent="오늘의 급식 메뉴를 찾을 수 없습니다."; }
    if(menuListDiv) menuListDiv.innerHTML="";
    if(holidayMessageEl){ holidayMessageEl.style.display="block"; holidayMessageEl.textContent="즐거운 휴일 되세요!"; holidayMessageEl.style.color="#888"; holidayMessageEl.style.fontSize="1em"; }
    return;
  }
  if(menuListDiv) menuListDiv.innerHTML="";
  if(holidayMessageEl) holidayMessageEl.style.display="none";
  meals[day].forEach(menu=>{
    db.collection("ratings").where("date","==",dateStr).where("menu","==",menu).get().then(snapshot=>{
      let sum=0,count=0;
      snapshot.forEach(doc=>{ const v=Number(doc.data().score); if(!isNaN(v)){ sum+=v; count++; } });
      const avg = count ? (sum/count).toFixed(1) : "아직 없음. 첫 번째 평점을 남겨보세요!";
      const isRated=ratedMenus.has(menu);
      const card=createCard(menu,avg,count,isRated,dateStr);
      if(menuListDiv) menuListDiv.appendChild(card);
    });
  });
}
function submitRating(menu,score,dateStr,buttonsContainer,info){
  const userId=getLocalUserId();
  const localKey=buildLocalRatedKey(userId,dateStr,menu);
  db.collection("ratings").add({menu,score:parseInt(score,10),date:dateStr,user:userId}).then(()=>{
    click.currentTime=0; click.play();
    localStorage.setItem(localKey,"1");
    ratedMenus.add(menu);
    setCardColor(info.parentNode,score);
    db.collection("ratings").where("date", "==", dateStr).where("menu", "==", menu).get().then(snapshot => {
      let sum = 0, count = 0;
      snapshot.forEach(doc => {
        const v = Number(doc.data().score);
        if (!isNaN(v)) { sum += v; count++; }
      });
      const avg = count ? (sum / count).toFixed(1) : `${score}.0`;
      info.textContent = typeof avg === "string" ? `평균 평점 : ${avg}` : `평균 평점 : ${avg} (평가 ${count}개)`;
    });
    Array.from(buttonsContainer.children).forEach(btn=>btn.style.opacity=0.6);
    alert(menu + " 평점 " + score + "점이 저장되었습니다!");
    computeWeeklyMonthlyAverages();
  }).catch(err=>{ alert("저장 실패: " + err); });
}
document.getElementById("mainThemeIcon").addEventListener("click",()=>{
    document.getElementById("themeOptions").classList.toggle("show");
});
document.querySelectorAll(".theme-icon.option").forEach(opt=>{
    opt.addEventListener("click",e=>{
        const theme=e.currentTarget.dataset.theme;
        document.body.className=theme;
        localStorage.setItem("theme",theme);
        document.getElementById("themeOptions").classList.remove("show");
    });
});
const savedTheme=localStorage.getItem("theme");
if(savedTheme) document.body.className=savedTheme;
loadTodayMenu();
setInterval(()=>{ getSeoulNow(); },15000);





