const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwYOeRtEfRrWnIBNylY6ctLKoIp0vregiw0cFnVEBtWSx9D7i3ZDztnSmUyNnoBfQj4Sg/exec";

// グローバルスコープに全て出す（確実性のために）
window.scores = { aggressor: 0, victim: 0, caring: 0, childlike: 0 };
window.itemsDone = 0;
window.actionLog = { checkboxes: [], events: {} };

document.addEventListener("DOMContentLoaded", () => {
  const modalOverlay = document.getElementById("modal-overlay");
  const modalContent = document.getElementById("modal-content");
  const customAlert = document.getElementById("custom-alert");
  const alertMsg = document.getElementById("alert-msg");

  // --- 基本ユーティリティ ---
  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  window.updateGauge = () => {
    let max = 1;
    for (const v of Object.values(window.scores)) { if (v > max) max = v; }
    ["aggressor", "victim", "caring", "childlike"].forEach(t => {
      const bar = document.getElementById("bar-" + t);
      if (bar) {
        bar.style.width = (window.scores[t] / max * 100) + "%";
        bar.innerHTML = window.scores[t] > 0 ? window.scores[t] : "";
      }
    });
  };

  window.showAlert = (msg, callback) => {
    alertMsg.innerHTML = msg;
    customAlert.classList.remove("hidden");
    window.alertCallback = callback;
  };

  document.getElementById("alert-close").onclick = () => {
    customAlert.classList.add("hidden");
    if (window.alertCallback) window.alertCallback();
  };

  window.closeModal = (id) => {
    modalOverlay.classList.add("hidden");
    modalContent.innerHTML = "";
    const btn = document.getElementById("item-" + id);
    if (btn && !btn.classList.contains("done")) {
      btn.classList.add("done");
      window.itemsDone++;
      if (window.itemsDone === 7) document.getElementById("submit-btn").classList.remove("hidden");
    }
  };

  // --- 1. スタート ---
  document.getElementById("start-btn").onclick = () => {
    document.getElementById("start-screen").classList.remove("active");
    document.getElementById("checkbox-screen").classList.add("active");
    const container = document.getElementById("checkbox-container");
    container.innerHTML = "";
    shuffle([...checkboxQuestions]).forEach(q => {
      const label = document.createElement("label");
      label.className = "checkbox-item";
      label.innerHTML = `<input type="checkbox" value="${q.type}" data-text="${q.text}"><span class="checkmark"></span>${q.text}`;
      container.appendChild(label);
    });
  };

  // --- 2. お部屋へ ---
  document.getElementById("to-room-btn").onclick = () => {
    const checked = document.querySelectorAll('#checkbox-container input:checked');
    if (checked.length === 0) return alert("何か一つ選んでね！");
    checked.forEach(cb => {
      window.scores[cb.value]++;
      window.actionLog.checkboxes.push(cb.getAttribute("data-text"));
    });
    window.updateGauge();
    document.getElementById("checkbox-screen").classList.remove("active");
    document.getElementById("room-screen").classList.add("active");
  };

  // --- 3. ギミック処理 ---
  document.querySelectorAll(".room-item").forEach(item => {
    item.onclick = () => {
      if (item.classList.contains("done")) return;
      const id = item.id.replace("item-", "");
      openModal(id);
    };
  });

  function openModal(id) {
    modalOverlay.classList.remove("hidden");
    modalContent.innerHTML = "";

    // 🎁 ウィッシュリスト
    if (id === "wish") {
      modalContent.innerHTML = `<h3>🎁 何をもらえたら嬉しい？</h3><p>3つ選んでね</p><div class="emoji-grid" id="wish-grid"></div><button id="wish-submit-btn" class="btn">決定！</button>`;
      const grid = document.getElementById("wish-grid");
      const currentSelected = [];
      wishlistItems.forEach((item, idx) => {
        const btn = document.createElement("button");
        btn.className = "emoji-btn";
        btn.innerHTML = `${item.emoji}<span class="emoji-name">${item.name}</span>`;
        btn.onclick = () => {
          if (currentSelected.includes(item)) {
            currentSelected.splice(currentSelected.indexOf(item), 1);
            btn.classList.remove("selected");
          } else if (currentSelected.length < 3) {
            currentSelected.push(item);
            btn.classList.add("selected");
          }
        };
        grid.appendChild(btn);
      });
      document.getElementById("wish-submit-btn").onclick = () => {
        if (currentSelected.length === 0) return alert("選んでね！");
        currentSelected.forEach(s => window.scores[s.type] += 2);
        window.actionLog.events["ウィッシュリスト"] = currentSelected.map(s => s.name).join(", ");
        window.updateGauge(); window.closeModal(id);
      };

    // 🌌 深淵
    } else if (id === "abyss") {
      modalContent.innerHTML = `<h3>🌌 深淵の選択</h3><p>相手の「一番見たい部分」は？</p>
        <button class="option-btn" id="aby-1">誰も知らない心の傷や闇の深淵</button>
        <button class="option-btn" id="aby-2">誰にも邪魔されない純粋な遊び場</button>
        <button class="option-btn" id="aby-3">全てを支配する揺るぎない自信</button>
        <button class="option-btn" id="aby-4">自分だけを包み込む絶対的な安らぎ</button>`;
      document.getElementById("aby-1").onclick = () => { window.scores.victim += 3; window.actionLog.events["深淵"] = "深淵の闇"; window.updateGauge(); window.closeModal(id); };
      document.getElementById("aby-2").onclick = () => { window.scores.childlike += 3; window.actionLog.events["深淵"] = "遊び場"; window.updateGauge(); window.closeModal(id); };
      document.getElementById("aby-3").onclick = () => { window.scores.aggressor += 3; window.actionLog.events["深淵"] = "支配欲"; window.updateGauge(); window.closeModal(id); };
      document.getElementById("aby-4").onclick = () => { window.scores.caring += 3; window.actionLog.events["深淵"] = "安らぎ"; window.updateGauge(); window.closeModal(id); };

    // 📱 LINE下書き (CSS適用版)
    } else if (id === "phone") {
      modalContent.innerHTML = `
        <h3>📱 理想のパートナーへ…</h3>
        <div class="darling-chat">「本気で入力しなよ。下書き、全部見てるからさ♡」</div>
        <input type="text" id="free-input" class="free-text-input" placeholder="ここに入力...">
        <button id="phone-save-btn" class="btn">保存（ダーリンに提出）</button>
      `;
      document.getElementById("phone-save-btn").onclick = () => {
        const val = document.getElementById("free-input").value.trim();
        window.actionLog.events["LINE下書き"] = val || "（無言）";
        let rule = darlingLineLogic[darlingLineLogic.length - 1];
        for (const r of darlingLineLogic) {
          if (r.keywords && r.keywords.some(k => val.includes(k))) { rule = r; break; }
          if (r.condition && r.condition(val)) { rule = r; break; }
        }
        window.scores[rule.scoreType] += rule.scoreChange;
        window.showAlert("👩🏻‍💻 ダーリンちゃん<br>" + rule.reply, () => {
          window.updateGauge(); window.closeModal(id);
        });
      };

    // ⚖️ 綱引き
    } else if (id === "tug") {
      modalContent.innerHTML = `<h3>⚖️ 運命の綱引き</h3><p>10秒間連打！<br><b>「自分が引く！」で主導権を奪え！</b></p>
        <div class="tug-game-area">
          <div class="tug-timer" id="tug-timer">10.0</div>
          <div class="tug-container">
            <button class="tug-btn me" id="tug-pull-btn">自分が引く！</button>
            <div class="tug-bar-wrap"><div class="tug-heart" id="tug-heart">🤍</div></div>
            <button class="tug-btn you">相手の力</button>
          </div>
        </div>`;
      let pos = 50; let time = 100;
      const tugBtn = document.getElementById("tug-pull-btn");
      const heart = document.getElementById("tug-heart");
      const timer = document.getElementById("tug-timer");

      tugBtn.onclick = () => { pos = Math.max(0, pos - 4); heart.style.left = pos + "%"; };
      const loop = setInterval(() => {
        pos = Math.min(100, pos + 1.4);
        if (heart) heart.style.left = pos + "%";
        time--;
        if (timer) timer.innerText = (time / 10).toFixed(1);
        if (time <= 0) {
          clearInterval(loop);
          window.actionLog.events["綱引き最終位置"] = pos;
          let sT = ""; let m = "";
          if (pos <= 35) { sT = "victim"; m = "自分が支配したいんやな。理想の相手は尽くしてくれる『犠牲者』や。"; }
          else if (pos <= 65) { sT = "childlike"; m = "対等がいいんやね。無邪気な『子ども』が理想かな。"; }
          else { sT = "aggressor"; m = "ズルズルに引かれたなｗ 強い『侵略者』に支配されたいんやろ？"; }
          window.scores[sT] += 4; window.updateGauge();
          window.showAlert("👩🏻‍💻 " + m, () => window.closeModal(id));
        }
      }, 100);

    // 🎯 的当て
    } else if (id === "target") {
      modalContent.innerHTML = `<h3>🎯 運命の幻影</h3><p>5秒間！捕まえまくるか、待つか…</p>
        <div class="target-area" id="target-area">
          <div class="target-icon" id="target-icon">👤</div>
        </div>`;
      let clicks = 0;
      const icon = document.getElementById("target-icon");
      const hit = (e) => {
        e.preventDefault(); clicks++; 
        icon.innerText = "❤️"; 
        setTimeout(() => { if (icon) icon.innerText = "👤"; }, 100);
      };
      icon.addEventListener("mousedown", hit); icon.addEventListener("touchstart", hit);
      const move = setInterval(() => {
        if (icon) {
          icon.style.top = Math.random() * 150 + "px";
          icon.style.left = Math.random() * 80 + "%";
        }
      }, 500);
      setTimeout(() => {
        clearInterval(move);
        window.actionLog.events["的当てヒット数"] = clicks;
        let sT = ""; let m = "";
        // たくさん捕まえる(追う) = 相手は追われる側 = 犠牲者
        if (clicks === 0) { sT = "aggressor"; m = "全く捕まえんかったな。理想は向こうから来る『侵略者』か。"; }
        else if (clicks < 8) { sT = "childlike"; m = "ほどほどやね。一緒に遊べる『子ども』タイプが理想かも。"; }
        else if (clicks < 18) { sT = "caring"; m = "しっかり確保したね。君が『保護者』になりたいんやな。"; }
        else { sT = "victim"; m = "獲物を逃さない執念ｗ 理想の相手は君に従う『犠牲者』やわ。"; }
        window.scores[sT] += 4; window.updateGauge();
        window.showAlert("👩🏻‍💻 " + m, () => window.closeModal(id));
      }, 5000);

    // 👩🏻‍💻 尋問
    } else if (id === "darling") {
      modalContent.innerHTML = `<h3>👩🏻‍💻 ダーリンちゃんの尋問</h3><p>「理想の相手に何をしてほしいん？」</p>
        <button class="option-btn" id="inq-1">「私を強引にリードしてほしい」</button>
        <button class="option-btn" id="inq-2">「私の思いつきを面白がってほしい」</button>
        <button class="option-btn" id="inq-3">「私の生活や体調を丸ごと支えてほしい」</button>
        <button class="option-btn" id="inq-4">「……私の深淵に、黙って寄り添ってほしい」</button>`;
      document.getElementById("inq-1").onclick = () => { window.scores.aggressor += 3; window.actionLog.events["尋問"] = "リード"; window.updateGauge(); window.closeModal(id); };
      document.getElementById("inq-2").onclick = () => { window.scores.childlike += 3; window.actionLog.events["尋問"] = "面白がる"; window.updateGauge(); window.closeModal(id); };
      document.getElementById("inq-3").onclick = () => { window.scores.caring += 3; window.actionLog.events["尋問"] = "支える"; window.updateGauge(); window.closeModal(id); };
      document.getElementById("inq-4").onclick = () => { window.scores.victim += 3; window.actionLog.events["尋問"] = "深淵"; window.updateGauge(); window.closeModal(id); };

    // 👁️ 見つめ合い
    } else if (id === "eye") {
      modalContent.innerHTML = `<h3>👁️ 理想との見つめ合い</h3><p>長押しして視線を合わせ続けて！</p>
        <div id="stare-area" style="font-size:60px; cursor:pointer; margin:20px;">👩🏻‍💻</div>
        <div id="stare-dialogue" style="font-weight:bold; color:var(--primary-color); min-height:40px;">（じーっ……）</div>`;
      let hold = 0; let eyeLoop;
      const area = document.getElementById("stare-area");
      const diag = document.getElementById("stare-dialogue");

      const start = (e) => {
        e.preventDefault(); hold = 0;
        const onEnd = () => {
          clearInterval(eyeLoop);
          document.removeEventListener("mouseup", onEnd); document.removeEventListener("touchend", onEnd);
          area.classList.remove("pressure-heartbeat"); document.body.classList.remove("extreme-pressure");
          window.actionLog.events["見つめ合い時間"] = hold + "ms";
          let sT = ""; let m = "";
          if (hold < 3000) { sT = "caring"; m = "照れ屋か！優しい『保護者』に守られてなさいｗ"; }
          else if (hold < 6000) { sT = "childlike"; m = "圧を楽しんでたな！一緒にふざけられる『子ども』が理想かな。"; }
          else if (hold < 9000) { sT = "aggressor"; m = "バチバチやん。強い『侵略者』と殴り合いたいんやな。"; }
          else { sT = "victim"; m = "……君、相当なマゾやね。ILIみたいな『犠牲者』に呑まれたいんやｗ"; }
          window.scores[sT] += 4; window.updateGauge();
          window.showAlert("👩🏻‍💻 " + m, () => window.closeModal(id));
        };
        document.addEventListener("mouseup", onEnd); document.addEventListener("touchend", onEnd);
        eyeLoop = setInterval(() => {
          hold += 100;
          if (hold === 1000) diag.innerText = "「お、いい視線やん。ドキドキする？」";
          if (hold === 3000) { diag.innerText = "「……ILIの深淵がそんなに気になるん？」"; area.classList.add("pressure-heartbeat"); }
          if (hold === 5500) diag.innerText = "「その不器用な顔、最高にLIIっぽいわ♡」";
          if (hold === 8000) { diag.innerText = "「……もう離してあげないよ？♡」"; document.body.classList.add("extreme-pressure"); }
        }, 100);
      };
      area.addEventListener("mousedown", start); area.addEventListener("touchstart", start);
    }
  }

  // --- 🐛 芋虫 ---
  let bugClicks = 0;
  document.getElementById("item-bug").onclick = () => {
    const bug = document.getElementById("item-bug");
    const speech = document.getElementById("bug-speech");
    if (bug.classList.contains("dead")) return;
    bugClicks++;
    speech.classList.remove("hidden");
    if (bugClicks < 10) speech.innerText = "理想を求めるのも不合理だな。";
    else if (bugClicks < 20) speech.innerText = "おい、不快だ。やめろ。";
    else if (bugClicks < 30) speech.innerText = "ぐ……圧をかけるのが趣味か！？";
    else {
      speech.innerText = "グアアアァァ！！！"; bug.innerText = "💥"; bug.classList.add("dead");
      window.scores.aggressor += 10; window.updateGauge();
      window.actionLog.events["隠し要素"] = "芋虫殺害";
      setTimeout(() => { bug.innerText = "🪦"; speech.innerText = "（ここに理屈っぽい虫がいた）"; }, 1000);
    }
  };

  // --- 5. 結果出力 ---
  document.getElementById("submit-btn").onclick = () => {
    let maxT = "childlike", maxS = -1;
    for (const [t, s] of Object.entries(window.scores)) { if (s > maxS) { maxS = s; maxT = t; } }
    const idV = document.getElementById("type-input").value.trim() || "未入力";
    const idealV = document.getElementById("ideal-socio").value.trim() || "未入力";
    document.getElementById("result-identity").innerText = `自認：${idV} / 理想：${idealV}`;
    const res = resultsData[maxT];
    let gemi = res.gemi;
    if (idV.toUpperCase().includes("LII") && idealV.toUpperCase().includes("ILI")) {
      gemi += `<br><br><strong style='color:#6c5ce7'>👩🏻‍💻 ダーリンちゃん：</strong>「やっぱりILIが好きなん？破滅に向かうLII、最高にエモいわ♡」`;
    }
    document.getElementById("result-content").innerHTML = `<div class="result-title">${res.title}</div><p>${res.desc}</p><div class="gemi-comment"><strong>🐿️ ジェミ分析：</strong><br>${gemi}</div>`;
    document.getElementById("room-screen").classList.remove("active");
    document.getElementById("result-screen").classList.add("active");
    if (GAS_WEB_APP_URL.startsWith("https")) {
      fetch(GAS_WEB_APP_URL, { method: "POST", mode: "no-cors", body: JSON.stringify({ identity: idV, resultType: res.title, scores: window.scores, actionLog: window.actionLog, ideal: idealV }) });
    }
  };

  // 画像保存と共有
  document.getElementById("save-img-btn").onclick = () => {
    html2canvas(document.getElementById("capture-area")).then(canvas => {
      const link = document.createElement("a"); link.download = "result.png"; link.href = canvas.toDataURL("image/png"); link.click();
    });
  };

  document.getElementById("share-nav-btn").onclick = () => {
    const title = document.querySelector(".result-title").innerText;
    const text = `私が本能的に惹かれるのは【${title}】でした！\n#理想のソシオ恋愛診断\n`;
    if (navigator.share) navigator.share({ text: text, url: location.href });
    else window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(location.href)}`);
  };

  document.getElementById("retry-btn").onclick = () => location.reload();
});