const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwYOeRtEfRrWnIBNylY6ctLKoIp0vregiw0cFnVEBtWSx9D7i3ZDztnSmUyNnoBfQj4Sg/exec";

window.scores = { aggressor: 0, victim: 0, caring: 0, childlike: 0 };
window.itemsDone = 0;
window.actionLog = { checkboxes: [], events: {} };
window.finalStyle = ""; // 16タイプ特定用

let activeInterval = null;
let activeTimeout = null;
let detailStep = 0;
let detailAns = { tf: "", ei: "" };

function clearAllTimers() {
  if (activeInterval) { clearInterval(activeInterval); activeInterval = null; }
  if (activeTimeout) { clearTimeout(activeTimeout); activeTimeout = null; }
}

document.addEventListener("DOMContentLoaded", () => {
  const modalOverlay = document.getElementById("modal-overlay");
  const modalContent = document.getElementById("modal-content");
  const customAlert = document.getElementById("custom-alert");
  const alertMsg = document.getElementById("alert-msg");

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  document.getElementById("submit-btn").onclick = () => {
    // 画面を切り替えてローディングを表示
    document.getElementById("room-screen").classList.remove("active");
    document.getElementById("result-screen").classList.add("active");
    
    const captureArea = document.getElementById("capture-area");
    const loading = document.getElementById("loading-overlay");
    
    captureArea.classList.add("hidden");
    loading.classList.remove("hidden");

    // 2秒間ローディングを見せてから、中身を生成する
    setTimeout(() => {
        loading.classList.add("hidden");
        captureArea.classList.remove("hidden");
        processResult(); // ここで計算と表示を実行！
    }, 2000);
  };
  window.updateGauge = () => {
    let max = 1;
    for (const v of Object.values(window.scores)) { if (v > max) max = v; }
    ["aggressor", "victim", "caring", "childlike"].forEach(t => {
      const bar = document.getElementById("bar-" + t);
      if (bar) { bar.style.width = (window.scores[t] / max * 100) + "%"; bar.innerHTML = window.scores[t] > 0 ? window.scores[t] : ""; }
    });
  };

  window.showAlert = (msg, callback) => {
    alertMsg.innerHTML = msg; customAlert.classList.remove("hidden");
    window.alertCallback = callback;
  };
  document.getElementById("alert-close").onclick = () => {
    customAlert.classList.add("hidden"); if (window.alertCallback) window.alertCallback();
  };

  window.closeModal = (id) => {
    clearAllTimers();
    modalOverlay.classList.add("hidden");
    const btn = document.getElementById("item-" + id);
    if (btn && !btn.classList.contains("done")) {
      btn.classList.add("done");
      window.itemsDone++;
      if (window.itemsDone >= 10) { // ★ 全13中10個でOK！
        document.getElementById("submit-btn").classList.remove("hidden");
        document.querySelector(".room-guide").innerHTML = "<b>解析準備が整ったわよ！結果を見よう！</b>";
      }
    }
  };

  window.showResultInModal = (msg, callbackId) => {
    clearAllTimers();
    modalContent.innerHTML = `<div style="padding:20px; text-align:left; background:#fff0f3; border-left:5px solid #ff4757; border-radius:8px; margin-bottom:20px;">
        <p style="font-weight:bold; color:#d63031; line-height:1.6;">${msg}</p></div>
      <button id="modal-next-btn" class="btn" style="background:#0984e3;">確認</button>`;
    document.getElementById("modal-next-btn").onclick = () => { window.closeModal(callbackId); };
  };
  // --- イベントデリゲーション ---
  document.addEventListener("click", (e) => {
    const target = e.target; // ★この一行が抜けていたか外に出ていました！

    // スタートボタン
    if (target.id === "start-btn") {
      document.getElementById("start-screen").classList.remove("active");
      document.getElementById("checkbox-screen").classList.add("active");
      const container = document.getElementById("checkbox-container");
      container.innerHTML = "";
      shuffle([...checkboxQuestions]).forEach(q => {
        const label = document.createElement("label"); label.className = "checkbox-item";
        label.innerHTML = `<input type="checkbox" value="${q.type}" data-text="${q.text}"><span class="checkmark"></span>${q.text}`;
        container.appendChild(label);
      });
      return;
    }

    if (target.id === "to-room-btn") {
      const checked = document.querySelectorAll('#checkbox-container input:checked');
      if (checked.length === 0) return alert("一つは選んでね！");
      checked.forEach(cb => { window.scores[cb.value]++; window.actionLog.checkboxes.push(cb.getAttribute("data-text")); });
      window.updateGauge();
      document.getElementById("checkbox-screen").classList.remove("active");
      document.getElementById("room-screen").classList.add("active");
      return;
    }

    const roomItem = target.closest(".room-item");
    if (roomItem && !roomItem.classList.contains("done")) {
      handleItemOpen(roomItem.id.replace("item-", ""));
      return;
    }

    // ★ 16タイプ特定ギミックのボタン処理
    if (target.closest("#detail-btn")) {
      target.closest("#detail-btn").classList.add("hidden");
      startDetailDiagnosis();
      return;
    }
    if (target.classList.contains("detail-ans-btn")) {
      handleDetailAnswer(target.dataset.val);
      return;
    }

    if (target.id === "submit-btn") processResult();
// 保存ボタンの処理
    if (target.id === "save-img-btn") {
      const captureArea = document.getElementById("capture-area");
      html2canvas(captureArea, {
        backgroundColor: "#ffffff", // キャンバスの背景を白に固定
        scale: 2, // 高画質化
        useCORS: true, // 外部リソースがある場合の対策
      }).then(canvas => {
        const link = document.createElement("a");
        link.download = "ideal-result.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
      });
      return;
    }
    if (target.id === "share-nav-btn") {
          const title = document.querySelector(".result-title").innerText; // 例：犠牲者に惹かれる者
          let text = `私が本能的に惹かれるのは【${title}】でした！\n`;
          
          // ★ 16タイプ特定まで終わっていたら、そのタイプ名もシェアに含める！
          const detailRes = document.getElementById("detail-result");
          if (detailRes && !detailRes.classList.contains("hidden")) {
            const typeMatch = detailRes.innerText.match(/【(.*?)】/);
            if (typeMatch) {
              text += `理想のパートナーは【${typeMatch[1]}】のようです。マッチ度も解析済み！\n`;
            }
          }
          
          text += `#理想のソシオ恋愛診断\n`;
          const url = "https://mofu-mitsu.github.io/ideal-partner-diagnosis/";

          if (navigator.share) {
            navigator.share({ text: text, url: url });
          } else {
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
          }
        }
    if (target.id === "retry-btn") location.reload();
  });

  // --- 16タイプ特定ギミック関数 ---
  window.startDetailDiagnosis = () => {
    detailStep = 1;
    document.getElementById("detail-result").classList.remove("hidden");
    renderDetailQuestion();
  };

  function renderDetailQuestion() {
    const dr = document.getElementById("detail-result");
    if (detailStep === 1) {
      dr.innerHTML = `<strong>Q1. 相手に一番求めるのは？</strong><br><br>
        <button class="option-btn detail-ans-btn" data-val="T">知的な会話や、合理的な判断ができること</button>
        <button class="option-btn detail-ans-btn" data-val="F">感情を共有し、道徳的な温かさがあること</button>`;
    } else if (detailStep === 2) {
      dr.innerHTML = `<strong>Q2. 相手の行動スタイルは？</strong><br><br>
        <button class="option-btn detail-ans-btn" data-val="E">外の世界に向かってエネルギッシュに動く</button>
        <button class="option-btn detail-ans-btn" data-val="I">自分の内面や、自分のペースを大切にする</button>`;
    }
  }

  window.handleDetailAnswer = (val) => {
    if (detailStep === 1) { detailAns.tf = val; detailStep = 2; renderDetailQuestion(); }
    else if (detailStep === 2) { detailAns.ei = val; calculate16Type(); }
  };

  function calculate16Type() {
    const style = window.finalStyle; 
    const t = detailAns.tf; const e = detailAns.ei;
    let finalType = "不明";

    // 4タイプ × T/F × E/I で16タイプを特定
    if (style === "aggressor") {
      if (t === "T" && e === "E") finalType = "SLE"; else if (t === "T" && e === "I") finalType = "LSI";
      else if (t === "F" && e === "E") finalType = "SEE"; else finalType = "ESI";
    } else if (style === "victim") {
      if (t === "T" && e === "E") finalType = "LIE"; else if (t === "T" && e === "I") finalType = "ILI";
      else if (t === "F" && e === "E") finalType = "EIE"; else finalType = "IEI";
    } else if (style === "caring") {
      if (t === "T" && e === "E") finalType = "LSE"; else if (t === "T" && e === "I") finalType = "SLI";
      else if (t === "F" && e === "E") finalType = "ESE"; else finalType = "SEI";
    } else if (style === "childlike") {
      if (t === "T" && e === "E") finalType = "ILE"; else if (t === "T" && e === "I") finalType = "LII";
      else if (t === "F" && e === "E") finalType = "IEE"; else finalType = "EII";
    }
    
    // ★ ここを partnerMessages（基本のセリフ）だけを出すように修正！
    // マトリックスメッセージ（matrixMessages）は一切見ないようにしました。
    let baseMsg = partnerMessages[finalType] || "君のこと、もっと知りたいな。理想に近づけるように頑張るよ。";

    document.getElementById("detail-result").innerHTML = `
      <h3 style="color:#6c5ce7; margin:0;">✨ 理想の16タイプ：【${finalType}】</h3>
      <div style="margin-top:10px; padding:12px; background:#fff; border-radius:8px; border:1px solid #ddd;">
        <p style="font-size:14px; text-align:left; line-height:1.5; color:#2d3436; margin:0;">
          <strong>${finalType}からの基本メッセージ：</strong><br><br>
          「${baseMsg}」
        </p>
      </div>
    `;
    window.actionLog.events["16タイプ特定"] = finalType;
  }

  // --- アイテム別 モーダル処理 ---
  function handleItemOpen(id) {
    clearAllTimers();
    modalOverlay.classList.remove("hidden");
    
    // 🎁 ウィッシュリスト
    if (id === "wish") {
      window.selectedWish = [];
      let html = `<h3>🎁 何をもらえたら一番嬉しい？</h3><p>3つ選んでね</p><div class="emoji-grid" id="wish-grid">`;
      wishlistItems.forEach((item, idx) => { html += `<button class="emoji-btn" id="wish-btn-${idx}">${item.emoji}<span class="emoji-name">${item.name}</span></button>`; });
      html += `</div><button id="wish-submit-btn" class="btn" style="background:#0984e3; margin-top:15px;">決定！</button>`;
      modalContent.innerHTML = html;

      wishlistItems.forEach((item, idx) => {
        document.getElementById(`wish-btn-${idx}`).onclick = function() {
          if (window.selectedWish.includes(item)) { window.selectedWish.splice(window.selectedWish.indexOf(item), 1); this.classList.remove("selected"); }
          else if (window.selectedWish.length < 3) { window.selectedWish.push(item); this.classList.add("selected"); }
        };
      });
      document.getElementById("wish-submit-btn").onclick = () => {
        if (window.selectedWish.length === 0) return alert("選んでね！");
        window.selectedWish.forEach(s => window.scores[s.type] += 2);
        window.actionLog.events["ウィッシュリスト"] = window.selectedWish.map(s => s.name).join(", ");
        window.updateGauge(); window.showResultInModal("👩🏻‍💻「ふーん、そういうのが好みなんやね。覚えとくわ♡」", id);
      };

    // 🌌 深淵
    } else if (id === "abyss") {
      modalContent.innerHTML = `<h3>🌌 深淵の選択</h3><p>相手の「一番見たい部分」はどこ？</p>
        <button class="option-btn" id="aby-v">誰も知らない心の傷や闇の深淵</button>
        <button class="option-btn" id="aby-ch">誰にも邪魔されない純粋な遊び場</button>
        <button class="option-btn" id="aby-a">全てを支配する揺るぎない自信</button>
        <button class="option-btn" id="aby-c">自分だけを包み込む絶対的な安らぎ</button>`;
      const bind = (btnId, type, text) => {
        document.getElementById(btnId).onclick = () => { window.scores[type] += 3; window.actionLog.events["深淵"] = text; window.updateGauge(); window.showResultInModal("👩🏻‍💻「へぇ……あなた、そういうのが好きなんや。なるほどね♡」", id); };
      };
      bind("aby-v", "victim", "深淵の闇"); bind("aby-ch", "childlike", "遊び場"); bind("aby-a", "aggressor", "支配欲"); bind("aby-c", "caring", "安らぎ");

    // 📱 LINE
    } else if (id === "phone") {
      modalContent.innerHTML = `<h3>📱 理想のパートナーへ…</h3><div class="darling-chat">「本気で入力しなよ。下書き、全部見てるからさ♡」</div>
        <input type="text" id="free-input" class="free-text-input" placeholder="メッセージを入力...">
        <button id="phone-save-btn" class="btn" style="background:#0984e3;">保存（ダーリンに提出）</button>`;
      document.getElementById("phone-save-btn").onclick = () => {
        const val = document.getElementById("free-input").value.trim();
        window.actionLog.events["LINE下書き"] = val || "（無言）";
        let rule = darlingLineLogic[darlingLineLogic.length - 1];
        for (const r of darlingLineLogic) {
          if (r.keywords && r.keywords.some(k => val.includes(k))) { rule = r; break; }
          if (r.condition && r.condition(val)) { rule = r; break; }
        }
        window.scores[rule.scoreType] += rule.scoreChange; window.updateGauge();
        window.showResultInModal("👩🏻‍💻 ダーリンちゃん<br>" + rule.reply, id);
      };
// ★ 🪞 真実の鏡（証明機能の罠を回避！魂の願望バージョン）
    } else if (id === "mirror") {
      modalContent.innerHTML = `<h3>🪞 真実の鏡</h3>
        <p>あなたがパートナーの瞳（鏡）の中に、映し出したいものはどれ？</p>
        
        <button class="option-btn" id="mir-vic">
          <strong>🌙 深淵の影</strong><br>
          <small>何も語らずとも理解し合える、孤独でミステリアスな静寂</small>
        </button>
        
        <button class="option-btn" id="mir-agg">
          <strong>⚔️ 不屈の誇り</strong><br>
          <small>どんな圧にも屈せず、愛する領域を命がけで守り抜く強さ</small>
        </button>
        
        <button class="option-btn" id="mir-car">
          <strong>🍵 献身のぬくもり</strong><br>
          <small>体調や食事を細かく世話し、常に快適な環境を整えてくれる愛</small>
        </button>
        
        <button class="option-btn" id="mir-chi">
          <strong>🧸 無垢な好奇心</strong><br>
          <small>常識を壊して、一緒にバカな遊びで笑い転げる純粋な時間</small>
        </button>`;

      const applyMirror = (styleName, styleJP, logText) => {
        window.scores[styleName] += 12; // さらに加点して決定打にする！
        window.actionLog.events["鏡の選択"] = logText;
        window.updateGauge();
        window.showResultInModal(`👩🏻‍💻「鏡の中に『${styleJP}』の魂を見たのね。それがあなたの本能が求めてる答えやわ♡」`, id);
      };

      document.getElementById("mir-vic").onclick = () => applyMirror("victim", "犠牲者", "深淵（犠牲者）");
      document.getElementById("mir-agg").onclick = () => applyMirror("aggressor", "侵略者", "不屈（侵略者）");
      document.getElementById("mir-car").onclick = () => applyMirror("caring", "保護者", "献身（保護者）");
      document.getElementById("mir-chi").onclick = () => applyMirror("childlike", "子ども", "無垢（子ども）");
    // 🏥 整骨院
    } else if (id === "clinic") {
      modalContent.innerHTML = `<h3>🏥 整骨院のクレーマー</h3><p style="font-size:14px; text-align:left;">理不尽に怒鳴る老害に遭遇！理想のパートナーにはどうしてほしい？</p>
        <button class="option-btn" id="cli-a">「ふざけるな！」と代わりに怒鳴って撃退してほしい</button>
        <button class="option-btn" id="cli-ch">冷静に老害の矛盾を論破してほしい</button>
        <button class="option-btn" id="cli-c">「店長さん可哀想…」と一緒に心を痛めて寄り添ってほしい</button>
        <button class="option-btn" id="cli-v">「人間って愚かだね…」と深い達観を見せてほしい</button>`;
      const b2 = (bId, type, txt, msg) => { document.getElementById(bId).onclick = () => { window.scores[type] += 3; window.actionLog.events["整骨院"] = txt; window.updateGauge(); window.showResultInModal(msg, id); }; };
      b2("cli-a", "aggressor", "怒鳴る", "👩🏻‍💻「代わりに怒鳴ってほしいんやね。力強い『侵略者』が理想なんや♡」");
      b2("cli-ch", "childlike", "論破", "👩🏻‍💻「冷静に論破か。賢い『子ども』タイプに守られたいんやな。」");
      b2("cli-c", "caring", "寄り添う", "👩🏻‍💻「優しいなぁ。共感してくれる『保護者』が理想やね。」");
      b2("cli-v", "victim", "達観", "👩🏻‍💻「達観してるねぇ。深淵を抱えた『犠牲者』が理想なんやな。」");

    // 🥊 対決
    } else if (id === "fight") {
      modalContent.innerHTML = `<h3>🥊 対決のリング</h3><p>相手と意見が真っ向から対立！理想の結末は？</p>
        <button class="option-btn" id="fgt-a">互いに一歩も引かず、バチバチに競い合いたい！</button>
        <button class="option-btn" id="fgt-v">相手を完全に論破し、ぐうの音も出ないほどねじ伏せたい。</button>
        <button class="option-btn" id="fgt-ch">議論の最中にふざけ始めて、笑い話にしてしまいたい。</button>
        <button class="option-btn" id="fgt-c">相手が折れて優しく諭してくれ、穏やかな空気に戻してほしい。</button>`;
      
      const b3 = (bId, type, txt, pts) => { 
        document.getElementById(bId).onclick = () => { 
          window.scores[type] += pts; // ★ここでpts（加点数）を反映！
          window.actionLog.events["対決"] = txt; 
          window.updateGauge(); 
          window.showResultInModal(`👩🏻‍💻「${txt}のが好きなんや。力強い関係を求めてるんやね♡」`, id); 
        }; 
      };
      b3("fgt-a", "aggressor", "競い合う", 6); // ★侵略者好きには多めに加点！
      b3("fgt-v", "victim", "ねじ伏せる", 3);
      b3("fgt-ch", "caring", "ふざける", 3);
      b3("fgt-c", "childlike", "諭される", 3);

    // ⚾ 芋虫遊び（★修正：遊ぶ＝子ども求む）
    } else if (id === "bugtoss") {
      modalContent.innerHTML = `<h3>⚾ 芋虫キャッチボール</h3><p>「一緒に芋虫投げて遊ぼうぜ！」</p>
        <div class="game-box"><div id="bug-ball" class="flying-bug">🐛</div><div id="bug-shout" class="bug-shout"></div></div>
        <button id="btn-throw" class="btn" style="background:#0984e3;">ノリノリで投げる！（連打）</button>
        <button id="btn-stop" class="btn" style="background:#d63031; margin-top:10px;">「キモい！やめろ！」</button>`;
      let throws = 0;
      document.getElementById("btn-throw").onclick = (e) => {
        e.preventDefault(); throws++;
        const bug = document.getElementById("bug-ball"); const shout = document.getElementById("bug-shout");
        bug.style.left = (Math.random() * 80) + "%"; bug.style.bottom = (Math.random() * 60 + 20) + "px"; bug.style.transform = `rotate(${Math.random() * 360}deg)`;
        shout.style.opacity = 1; shout.innerText = ["やめろ！", "Tiが乱れる！", "Se圧を感じる！", "不合理だ！"][throws % 4];
        setTimeout(() => { shout.style.opacity = 0; }, 500);
        if (throws >= 5) {
          window.scores.childlike += 4; window.updateGauge(); window.actionLog.events["芋虫遊び"] = "遊んだ";
          window.showResultInModal("👩🏻‍💻「あはは！一緒に遊んでくれるんや！一緒にバカやれる『子ども』が理想やね！」", id);
        }
      };
      document.getElementById("btn-stop").onclick = () => {
        window.scores.victim += 4; window.updateGauge(); window.actionLog.events["芋虫遊び"] = "キレた";
        window.showResultInModal("👩🏻‍💻「こっわ！キレんなや！私が従う『犠牲者』になってほしいってこと？」", id);
      };

    // 🧱 壁ドン
    } else if (id === "walldon") {
      modalContent.innerHTML = `<h3>🧱 壁ドンの圧</h3><p>「俺（私）の言うこと聞いてればいい」</p>
        <div class="game-box" style="background:#2d3436;"><div class="wall-alert">圧が迫ってくる…！</div><div id="darling-wall" class="wall-darling">👩🏻‍💻</div></div>
        <button id="btn-push" class="btn noselect" style="background:#0984e3;">押し返す！（連打）</button>
        <button id="btn-accept" class="btn" style="background:#d63031; margin-top:10px;">身を委ねる♡</button>`;
      let scale = 1.0; const wall = document.getElementById("darling-wall");
      activeInterval = setInterval(() => {
        scale += 0.04; if(wall) wall.style.transform = `translateX(-50%) scale(${scale})`;
        if (scale > 2.5) {
          clearAllTimers(); window.scores.aggressor += 4; window.updateGauge(); window.actionLog.events["壁ドン"] = "潰された";
          window.showResultInModal("👩🏻‍💻「抵抗せえへんの？強い『侵略者』に支配されたいんやな♡」", id);
        }
      }, 100);
      document.getElementById("btn-push").addEventListener("pointerdown", (e) => {
        e.preventDefault(); scale = Math.max(0.5, scale - 0.2);
        if (scale <= 0.6) {
          clearAllTimers(); window.scores.victim += 4; window.updateGauge(); window.actionLog.events["壁ドン"] = "押し返した";
          window.showResultInModal("👩🏻‍💻「痛ッ！逆にねじ伏せてくるとか…私が従う『犠牲者』になれってことね♡」", id);
        }
      });
      document.getElementById("btn-accept").onclick = () => {
        clearAllTimers(); window.scores.aggressor += 4; window.updateGauge(); window.actionLog.events["壁ドン"] = "委ねた";
        window.showResultInModal("👩🏻‍💻「素直でよろしい♡ 強い『侵略者』にリードされたいんやな。」", id);
      };

    // 🛏️ お世話
    } else if (id === "care") {
      modalContent.innerHTML = `<h3>🛏️ お世話の押し売り</h3><p>「疲れてるんでしょ？ほら、あーん♡」</p>
        <div class="game-box" style="background:#55efc4; display:flex; align-items:center; justify-content:center; font-size:60px;" id="spoon">🥄👩🏻‍💻</div>
        <button id="btn-eat" class="btn" style="background:#0984e3;">素直に食べる（受け入れる）</button>
        <button id="btn-take" class="btn noselect" style="background:#d63031; margin-top:10px;">奪い取って逆に食べさせる（連打）</button>`;
      let takes = 0;
      document.getElementById("btn-eat").onclick = () => {
        window.scores.caring += 4; window.updateGauge(); window.actionLog.events["お世話"] = "食べた";
        window.showResultInModal("👩🏻‍💻「よしよし♡ 世話焼いてくれる『保護者』が理想なんやな。」", id);
      };
      document.getElementById("btn-take").addEventListener("pointerdown", (e) => {
        e.preventDefault(); takes++; const sp = document.getElementById("spoon");
        if(sp) sp.innerText = takes % 2 === 0 ? "🥄😠" : "🍲😫";
        if (takes >= 5) {
          window.scores.childlike += 4; window.updateGauge(); window.actionLog.events["お世話"] = "奪った";
          window.showResultInModal("👩🏻‍💻「ちょ、無理やり食べさせんといて！手のかかる『子ども』を世話したいんやなｗ」", id);
        }
      });

    // ⛓️ 逃亡
    } else if (id === "chase") {
      modalContent.innerHTML = `<h3>⛓️ 誘惑の逃亡</h3><p>「ふふっ……私を捕まえられる？♡」</p>
        <div class="game-box" style="background:#6c5ce7; color:white;"><div id="chase-darling" class="chase-darling">👩🏻‍💻</div></div>
        <button id="btn-chase" class="btn noselect" style="background:#0984e3;">追いかける！（連打）</button>
        <button id="btn-ignore" class="btn" style="background:#d63031; margin-top:10px;">放置する（来いよ）</button>`;
      let scale = 1.0; const dar = document.getElementById("chase-darling");
      activeInterval = setInterval(() => {
        scale -= 0.03; if(dar) dar.style.transform = `translateX(-50%) scale(${scale})`;
        if (scale <= 0) {
          clearAllTimers(); window.scores.aggressor += 4; window.updateGauge(); window.actionLog.events["逃亡"] = "逃がした";
          window.showResultInModal("👩🏻‍💻「追ってこないの？……向こうから強引に来てくれる『侵略者』を待ってるんやな。」", id);
        }
      }, 100);
      document.getElementById("btn-chase").addEventListener("pointerdown", (e) => {
        e.preventDefault(); scale += 0.15;
        if (scale >= 1.5) {
          clearAllTimers(); window.scores.victim += 4; window.updateGauge(); window.actionLog.events["逃亡"] = "捕まえた";
          window.showResultInModal("👩🏻‍💻「捕まっちゃった♡ 逃げる相手を支配したい……『犠牲者』キラーやね♡」", id);
        }
      });
      document.getElementById("btn-ignore").onclick = () => {
        clearAllTimers(); window.scores.aggressor += 4; window.updateGauge(); window.actionLog.events["逃亡"] = "放置";
        window.showResultInModal("👩🏻‍💻「冷たいなぁ。自分が追うより、相手から追ってくる『侵略者』が理想なんやね。」", id);
      };

    // ⚖️ 綱引き
    } else if (id === "tug") {
      modalContent.innerHTML = `<h3>⚖️ 運命の綱引き</h3><p>10秒間連打！<br><b>「自分が引く！」で主導権を奪え！</b></p>
        <div class="tug-game-area"><div class="tug-timer" id="tug-timer">10.0</div><div class="tug-container"><button class="tug-btn me noselect" id="tug-pull-btn">自分が引く！</button><div class="tug-bar-wrap"><div class="tug-heart" id="tug-heart">🤍</div></div><button class="tug-btn you">相手の力</button></div></div>`;
      let pos = 50; let time = 100;
      activeInterval = setInterval(() => {
        pos = Math.min(100, pos + 1.2); document.getElementById("tug-heart").style.left = pos + "%";
        time--; document.getElementById("tug-timer").innerText = (time / 10).toFixed(1);
        if (time <= 0) {
          clearAllTimers(); window.actionLog.events["綱引き結果"] = pos;
          let sT = "", m = "";
          if (pos <= 35) { sT = "victim"; m = "👩🏻‍💻 自分が支配したいんやな。理想の相手は従順な『犠牲者』や。"; }
          else if (pos <= 65) { sT = "childlike"; m = "👩🏻‍💻 対等がいいんやね。無邪気な『子ども』が理想かな。"; }
          else { sT = "aggressor"; m = "👩🏻‍💻 ズルズルに引かれたなｗ 強い『侵略者』に支配されたいんやろ？"; }
          window.scores[sT] += 4; window.updateGauge(); window.showResultInModal(m, id);
        }
      }, 100);
      document.getElementById("tug-pull-btn").addEventListener("pointerdown", (e) => { e.preventDefault(); pos = Math.max(0, pos - 4); });

    // 🎯 的当て（★修正：捕まえる＝相手は犠牲者、待つ＝相手は侵略者）
    } else if (id === "target") {
      modalContent.innerHTML = `<h3>🎯 運命の幻影</h3><p>5秒間！逃げる幻影を捕まえろ！</p><div class="target-area" id="target-area"><div class="target-icon noselect" id="target-icon">👤</div></div>`;
      let clicks = 0; const icon = document.getElementById("target-icon");
      icon.addEventListener("pointerdown", (e) => { e.preventDefault(); clicks++; icon.innerText = "❤️"; setTimeout(() => {if(icon) icon.innerText = "👤";}, 100); });
      activeInterval = setInterval(() => { if(icon) { icon.style.top = Math.random() * 150 + "px"; icon.style.left = Math.random() * 80 + "%"; } }, 500);
      
      activeTimeout = setTimeout(() => {
        clearAllTimers(); window.actionLog.events["的当て数"] = clicks;
        let sT = "", m = "";
        if (clicks === 0) { sT = "aggressor"; m = "全く動かんかったな。向こうから来る『侵略者』を待ってるんやろ。"; }
        else if (clicks < 8) { sT = "childlike"; m = "ほどほどやね。一緒に遊べる『子ども』タイプが理想。"; }
        else if (clicks < 18) { sT = "caring"; m = "しっかり確保したね。君が『保護者』になりたいんやな。"; }
        else { sT = "victim"; m = "逃がさない執念ｗ 君に従う『犠牲者』が理想やわ。"; }
        window.scores[sT] += 4; window.updateGauge(); window.showResultInModal("👩🏻‍💻 " + m, id);
      }, 5000);

      // 👁️ 見つめ合い
    } else if (id === "eye") {
        modalContent.innerHTML = `<h3>👁️ 理想との見つめ合い</h3><p>長押しして視線を合わせ続けて！</p>
          <div id="stare-area" class="stare-box noselect">👩🏻‍💻</div>
          <div id="stare-dialogue" style="font-weight:bold; color:var(--primary-color); min-height:40px;">（じーっ……）</div>`;
        
        let hold = 0; 
        let isH = false;
        const area = document.getElementById("stare-area"); 
        const diag = document.getElementById("stare-dialogue");

        // ★ 長押し開始！
        const start = (e) => {
          e.preventDefault(); 
          if (isH) return; // 二重に走らないようにガード
          isH = true; 
          hold = 0; 
          clearAllTimers(); 
          area.classList.add("staring-now");
          
          activeInterval = setInterval(() => {
            hold += 100; 
            if (hold === 1000) diag.innerText = "「ドキドキする？」"; 
            if (hold === 3000) { diag.innerText = "「ILIの深淵が気になるん？」"; area.classList.add("pressure-heartbeat"); } 
            if (hold === 5500) diag.innerText = "「その不器用な顔、最高にLIIっぽいわ♡」";
            if (hold === 8000) { diag.innerText = "「……もう離してあげないよ？♡」"; document.body.classList.add("extreme-pressure"); }
          }, 100);
      };

      // ★ 長押し終了！
      const end = (e) => {
        if (!isH) return; 
        isH = false; 
        clearAllTimers(); 
        area.classList.remove("staring-now", "pressure-heartbeat"); 
        document.body.classList.remove("extreme-pressure");
        
        actionLog.events["見つめ合い"] = `${hold}ms`;
        let sT = "", m = ""; 
        if (hold < 3000) { sT = "caring"; m = "照れ屋か！優しい『保護者』に守られてなさいｗ"; } 
        else if (hold < 6000) { sT = "childlike"; m = "圧を楽しんでたな！一緒にふざけられる『子ども』が理想かな。"; } 
        else if (hold < 9000) { sT = "aggressor"; m = "バチバチやん。強い『侵略者』と殴り合いたいんやな。"; } 
        else { sT = "victim"; m = "相当なマゾやね。ILIみたいな『犠牲者』に呑まれたいんやｗ"; }
        
        window.scores[sT] += 4; 
        window.updateGauge(); 
        window.showResultInModal("👩🏻‍💻 " + m, id);
      };

      // スマホとPCの入力を確実に拾う
      area.addEventListener("pointerdown", start);
      area.addEventListener("pointerup", end);
      area.addEventListener("pointerleave", end);
      // 右クリックメニューを禁止して長押しを邪魔させない！
      area.addEventListener("contextmenu", (e) => e.preventDefault());
    }
  }

  // --- 🌿 芋虫大侵略 ---
  document.getElementById("item-invasion").onclick = () => {
    if (document.getElementById("item-invasion").classList.contains("done")) return;
    modalOverlay.classList.remove("hidden");
    modalContent.innerHTML = `<h3>🌿 謎の草むら</h3><p>突如、LSI芋虫（Se圧）の大群が侵略してきた！！</p>
      <div style="font-size:30px; letter-spacing:-5px; line-height:1.2; margin:10px 0;">🐛🐛🐛<br>🐛🐛🐛🐛🐛<br>🐛🐛</div>
      <p style="font-weight:bold; color:#d63031;">「私の完璧なTi-Seの陣形を見よ！侵略だ！」</p>
      <button id="inv-fight" class="btn" style="background:#d63031;">全力で潰す！（ミニゲーム）</button>
      <button id="inv-skip" class="btn" style="background:#0984e3; margin-top:10px;">キモいからドアを閉める（スキップ）</button>`;
    
    document.getElementById("inv-skip").onclick = () => { window.actionLog.events["芋虫大侵略"] = "スキップ"; window.closeModal("invasion"); };
    
    document.getElementById("inv-fight").onclick = () => {
      modalContent.innerHTML = `<h3>💥 芋虫防衛戦！</h3><p>5秒間、現れる芋虫をタップして潰せ！</p><div class="target-area" id="inv-area" style="background:#55efc4; position:relative;"></div>`;
      let crushed = 0; const area = document.getElementById("inv-area");
      activeInterval = setInterval(() => {
        const bug = document.createElement("div");
        bug.innerText = "🐛"; bug.style.position = "absolute"; bug.style.fontSize = "35px";
        bug.style.top = Math.random() * 150 + "px"; bug.style.left = Math.random() * 80 + "%";
        bug.className = "noselect";
        bug.addEventListener("pointerdown", (e) => { e.preventDefault(); crushed++; bug.innerText = "💥"; setTimeout(() => bug.remove(), 200); });
        area.appendChild(bug);
        setTimeout(() => { if(bug.parentNode) bug.remove(); }, 800);
      }, 300);
      
      activeTimeout = setTimeout(() => {
        clearAllTimers(); area.innerHTML = ""; window.actionLog.events["大侵略潰し数"] = crushed;
        let sT = "", m = "";
        if (crushed === 0) { sT = "aggressor"; m = "一匹も潰せんかったな。向こうから来る『侵略者』を待ってるんやろ？"; }
        else if (crushed < 10) { sT = "caring"; m = "ほどほどに掃除したな。平和を愛する『保護者』が理想やね。"; }
        else if (crushed < 20) { sT = "childlike"; m = "めっちゃ遊んでるやんｗ 一緒にバカやれる『子ども』が理想やな！"; }
        else { sT = "victim"; m = "狂ったように全滅させたなｗｗ 自分が圧倒したい＝相手に『犠牲者』を求めてるわ🔥"; }
        window.scores[sT] += 4; window.updateGauge(); window.showResultInModal("👩🏻‍💻 " + m, "invasion");
      }, 5000);
    };
  };

  // --- 🐛 隠し芋虫 ---
  let bugClicks = 0;
  document.getElementById("item-bug").onclick = () => {
    const bug = document.getElementById("item-bug"); const speech = document.getElementById("bug-speech");
    if (bug.classList.contains("dead")) return;
    bugClicks++; speech.classList.remove("hidden");
    if (bugClicks < 10) speech.innerText = "理想を求めるのも不合理だな。";
    else if (bugClicks < 20) speech.innerText = "おい、不快だ。やめろ。";
    else if (bugClicks < 30) speech.innerText = "ぐ……圧をかけるのが趣味か！？";
    else {
      speech.innerText = "グアアアァァ！！！"; bug.innerText = "💥"; bug.classList.add("dead");
      window.scores.victim += 5; window.updateGauge(); window.actionLog.events["隠し要素"] = "芋虫抹殺";
      setTimeout(() => { bug.innerText = "🪦"; speech.innerText = "（ここに理屈っぽい虫がいた）"; }, 1000);
    }
  };

  // --- 5. 結果出力 ---
  function processResult() {
    let maxT = "childlike", maxS = -1;
    for (const [t, s] of Object.entries(window.scores)) { if (s > maxS) { maxS = s; maxT = t; } }
    window.finalStyle = maxT;
    
    const idVRaw = document.getElementById("type-input").value.trim().toUpperCase();
    const idealVRaw = document.getElementById("ideal-socio").value.trim().toUpperCase();

    const detectSocioType = (str) => {
        const types = ["ILE","LII","ESE","SEI","EIE","IEI","SLE","LSI","SEE","ESI","LIE","ILI","LSE","SLI","IEE","EII"];
        for (let type of types) { if (str.includes(type)) return type; }
        return "";
    };

    const selfType = detectSocioType(idVRaw);
    const idealType = detectSocioType(idealVRaw);
    
    // --- 📊 相性解析（マトリックスメッセージ優先） ---
    let compatibilityHtml = "";
    if (idealType && socioRomanceStyles[idealType]) {
      const targetStyle = socioRomanceStyles[idealType]; 
      const targetScore = window.scores[targetStyle]; 
      let compPercent = Math.min(100, Math.max(0, Math.floor(30 + (targetScore * 3.5))));
      
      let matrixMsg = "";
      if (selfType && matrixMessages[selfType] && matrixMessages[selfType][idealType]) {
        matrixMsg = matrixMessages[selfType][idealType];
      } else if (partnerMessages[idealType]) {
        matrixMsg = partnerMessages[idealType];
      } else {
        matrixMsg = "君のこと、もっと知りたいな。理想に近づけるように頑張るよ。";
      }

      compatibilityHtml = `
        <div class="compatibility-box">
          <h3 style="color:#0984e3; margin-top:0;"><i class="fa-solid fa-heart-circle-check"></i> ${idealType} との相性解析</h3>
          <div style="font-size:24px; font-weight:bold; color:#d63031; margin:10px 0;">マッチ度：${compPercent}％</div>
          <p style="font-size:14px; text-align:left; background:white; padding:12px; border-radius:5px; line-height:1.5; color:#2d3436;">
            <strong>${idealType}からのメッセージ：</strong><br><br>
            ${matrixMsg}
          </p>
          <!-- ★ ここのセリフを復活！ -->
          <p style="font-size:12px; color:#666; margin-top:10px; font-weight:bold; text-align:left;">
            👩🏻‍💻「マッチ度が低くても、理想に選んでる時点で惹かれてるってことやろ？……結局、理屈じゃないんよね♡」
          </p>
        </div>
      `;
    }

    const res = resultsData[maxT];
    let gemi = res.gemi;
    
    // LII×ILIの時だけ出るねっとり煽り（みつき用ｗ）
    if (selfType === "LII" && idealType === "ILI") {
      gemi += `<br><br><strong style='color:#6c5ce7'>👩🏻‍💻 ダーリンちゃん：</strong>「やっぱりILIが好きなん？破滅に向かうLII、最高にエモいわ♡」`;
    }
    
    // 結果エリアに書き込み
    document.getElementById("capture-area").innerHTML = `
      <h2>🎉 解析結果</h2>
      <div class="result-identity">自認：${selfType || idVRaw || "未入力"} / 理想：${idealType || idealVRaw || "未入力"}</div>
      <div id="result-content">
        <div class="result-title">${res.title}</div>
        <div class="result-sub">${res.sub}</div>
        <div class="desc-box">${res.desc}</div>
        <div class="gemi-comment"><strong>🐿️ 分析：</strong><br>${gemi}</div>
        ${compatibilityHtml}
        
        <!-- ここで特定ボタンを再度配置する -->
        <div id="extra-diagnosis-area" style="margin-top:20px;">
          <button id="detail-btn" class="btn" style="background:#6c5ce7;">🔍 理想の16タイプを特定する！</button>
          <div id="detail-result" class="hidden" style="margin-top:15px; padding:15px; background:#f1f2f6; border-radius:8px; border:2px dashed #6c5ce7;"></div>
        </div>
      </div>
    `;

    // GAS送信
    if (GAS_WEB_APP_URL.startsWith("https")) {
      fetch(GAS_WEB_APP_URL, { method: "POST", mode: "no-cors", body: JSON.stringify({ identity: idVRaw, resultType: res.title, scores: window.scores, actionLog: window.actionLog, ideal: idealVRaw }) });
    }
  }
  function startDetailDiagnosis() {
    detailStep = 1;
    document.getElementById("detail-result").classList.remove("hidden");
    renderDetailQuestion();
  }
  function renderDetailQuestion() {
    const dr = document.getElementById("detail-result");
    if (detailStep === 1) {
      dr.innerHTML = `<strong>Q1. 相手に一番求めるのは？</strong><br><br>
        <button class="option-btn detail-ans-btn" data-val="T">知的な会話や合理的な判断</button>
        <button class="option-btn detail-ans-btn" data-val="F">感情の共有や道徳的な温かさ</button>`;
    } else if (detailStep === 2) {
      dr.innerHTML = `<strong>Q2. 相手の行動スタイルは？</strong><br><br>
        <button class="option-btn detail-ans-btn" data-val="E">外向的・エネルギッシュ</button>
        <button class="option-btn detail-ans-btn" data-val="I">内向的・マイペース</button>`;
    }
  }

  function handleDetailAnswer(val) {
    if (detailStep === 1) { detailAns.tf = val; detailStep = 2; renderDetailQuestion(); }
    else if (detailStep === 2) { detailAns.ei = val; calculate16Type(); }
  }
});
