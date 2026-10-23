(function () {
  "use strict";

  // ================= 玩家状态 =================
  let state = {
    hp: 100, san: 100, hunger: 60,
    hasWeapon: false, hasMeds: false, hasPhoto: false,
    team: [], // 最多两人
    day: 1,
    flags: { hasWhiteRoomFile: false, joinWhiteRoom: false, hiddenPower: "" },
    infectionTimer: 0
  };

  const $ = (sel) => document.querySelector(sel);

  // ================= 音乐与音效引擎 (Web Audio API) =================
  let audioCtx = null;
  let musicInterval = null;

  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playClickSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  }

  function playAmbientMusic() {
    if (musicInterval) return;
    // 简单的低沉氛围音，带一点滴答声
    const notes = [130.81, 146.83, 164.81, 196.00, 220.00]; // C3, D3, E3, G3, A3
    musicInterval = setInterval(() => {
      if (!audioCtx || audioCtx.state === 'suspended') return;
      if (Math.random() > 0.4) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = notes[Math.floor(Math.random() * notes.length)];
        gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2.5);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 2.5);
      }
    }, 3000);
  }

  // ================= 核心引擎 =================
  function updateUI() {
    $("#stat-hp").textContent = Math.max(0, state.hp);
    $("#stat-san").textContent = Math.max(0, state.san);
    $("#stat-hunger").textContent = Math.max(0, state.hunger);
    
    // 死亡警告颜色
    $("#stat-hp").style.color = state.hp <= 20 ? "#ff5252" : "#fff";
    $("#stat-san").style.color = state.san <= 20 ? "#ff5252" : "#fff";
    $("#stat-hunger").style.color = state.hunger <= 20 ? "#ff5252" : "#fff";

    const teamBar = $("#team-bar");
    if (state.team.length > 0) {
      teamBar.classList.remove("hidden");
      $("#team-list").textContent = state.team.join("、");
    } else {
      teamBar.classList.add("hidden");
    }
  }

  function checkDeath() {
    // 调整死亡条件：生命和饥饿 <= 0，理智 <= 20
    if (state.hp <= 0) return showEnd("你倒下了", "失血过多和伤痛让你失去了意识，你倒在了冰冷的废墟中。末世不相信眼泪。");
    if (state.san <= 20) return showEnd("精神崩溃", "无尽的恐惧和绝望压垮了你，你疯了。你在狂笑中走向了感染者群。");
    if (state.hunger <= 0) return showEnd("饥饿而死", "胃里像有一团火在烧，你连走路的力气都没有了。你最终没能熬过去。");
    return false;
  }

  // 增加弹窗提示功能
  function showToast(msg) {
    if (!msg) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = msg;
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.add("show"); }, 10);
    setTimeout(() => { 
      toast.classList.remove("show"); 
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  function applyEffect(effects, showToastFlag = true) {
        let msgArr = [];
    if (effects.hp) { 
      state.hp = Math.min(100, state.hp + effects.hp); // 增加上限限制
      msgArr.push(`❤️ 生命 ${effects.hp > 0 ? '+' : ''}${effects.hp}`); 
    }
    if (effects.san) { 
      state.san = Math.min(100, state.san + effects.san); // 增加上限限制
      msgArr.push(`🧠 理智 ${effects.san > 0 ? '+' : ''}${effects.san}`); 
    }
    if (effects.hunger) { 
      state.hunger = Math.min(100, state.hunger + effects.hunger); // 增加上限限制
      msgArr.push(`🍖 饥饿 ${effects.hunger > 0 ? '+' : ''}${effects.hunger}`); 
    }
    
    if (effects.weapon) state.hasWeapon = true;
    if (effects.meds) state.hasMeds = true;
    if (effects.infection) { state.infectionTimer = 3; msgArr.push(`🦠 感染倒计时开始`); }
    
    if (effects.team && state.team.length < 2 && !state.team.includes(effects.team)) {
      state.team.push(effects.team);
      msgArr.push(`👥 ${effects.team} 加入队伍`);
    }
    
    updateUI();
    if (showToastFlag && msgArr.length > 0) showToast(msgArr.join("<br>"));
    return checkDeath();
  }

  function showEnd(title, desc) {
    if (musicInterval) clearInterval(musicInterval);
    $("#page-game").classList.remove("active");
    $("#page-end").classList.add("active");
    $("#end-title").textContent = title;
    $("#end-desc").innerHTML = desc;
  }

  function renderScene(text, options) {
    $("#story-text").textContent = text;
    const container = $("#options-container");
    container.innerHTML = "";
    options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.textContent = opt.text;
      btn.onclick = () => {
        playClickSound();
        opt.action();
      };
      container.appendChild(btn);
    });
  }

  // ================= 第一天 =================
  function startPrologue() {
    initAudio(); playAmbientMusic();
    state = { hp: 100, san: 100, hunger: 80, hasWeapon: false, hasMeds: false, hasPhoto: false, team: [], day: 1, flags: {hasWhiteRoomFile: false, joinWhiteRoom: false, hiddenPower: ""}, infectionTimer: 0 };
    updateUI();
    $("#page-start").classList.remove("active");
    $("#page-game").classList.add("active");
    renderScene("水龙头已经拧不出一滴水，冰箱里只剩发霉的冰霜。窗外传来凄厉的惨叫，丧尸和变异者的嘶吼声越来越近。你拿起背包，准备推开防盗门。临走前，你只能带走一件东西防身：", [
      { text: "【生锈菜刀】（获得基础武力，战斗减伤）", action: () => { applyEffect({weapon: true}); startDay1_Early(); } },
      { text: "【半盒抗生素】（可清除感染，绝境保命）", action: () => { applyEffect({meds: true}); startDay1_Early(); } },
      { text: "【全家福照片】（理智上限提升，每日缓慢恢复理智）", action: () => { state.hasPhoto = true; state.san = 80; state.hunger = 50; updateUI(); showToast("🧠 初始理智调整为 80<br>🍖 饥饿值降至 50"); startDay1_Early(); } }
    ]);
  }

  function startDay1_Early() {
    applyEffect({ hunger: -10 });
    renderScene("【第一天·早】你走出楼道，外面的空气弥漫着浓重的血腥味。你来到一个十字路口：左边是大型连锁超市，似乎有物资，但也聚集着不少游荡的感染者；右边是阴暗的地铁站入口，深不见底；前面是一条狭窄的小巷，没有动静。", [
      { text: "去超市搜刮（极度危险，可能满载而归）", action: () => {
          if (Math.random() < 0.5) {
            applyEffect({ hunger: 60 });
            renderScene("你屏住呼吸，避开了几只感染者的视线，在超市仓库里翻到了不少未过期的罐头和瓶装水。你安全撤离了。", [{text:"前往诊所", action: startDay1_Mid}]);
          } else {
            if (state.hasWeapon) {
              applyEffect({ hp: -15, hunger: 60 });
              renderScene("你还是惊动了感染者。你挥舞着菜刀，砍翻了它们，但在搏斗中被抓伤了。你带着物资逃了出来。", [{text:"前往诊所", action: startDay1_Mid}]);
            } else {
              let infect = Math.random() < 0.3;
              applyEffect({ hp: -35, hunger: 60, infection: infect });
              renderScene("你被感染者发现了！在逃跑中，你被它们扑倒抓伤。你狼狈地捡起掉落的东西逃了出来。" + (infect ? "【伤口发黑，你感染了病毒】" : ""), [{text:"前往诊所", action: startDay1_Mid}]);
            }
          }
      }},
      { text: "去地铁站（阴暗潮湿，可能有精神污染）", action: () => { 
          applyEffect({ hunger: 40, san: -15 }); 
          renderScene("你摸黑进入地铁站，在废弃的自动售货机里砸出了一些水。但你一转头，看到墙壁上用血画着极端的诡异图腾，让你不寒而栗。", [{text:"前往诊所", action: startDay1_Mid}]); 
      }},
      { text: "穿过小巷（绝对安全，但没任何收获）", action: () => { 
          applyEffect({ hunger: -5, hp: -5 }); 
          renderScene("小巷里极其安静，什么也没有。但你空腹走了太久，身体开始虚弱。", [{text:"前往诊所", action: startDay1_Mid}]); 
      }}
    ]);
  }

  function startDay1_Mid() {
    applyEffect({ hunger: -10 });
    renderScene("【第一天·中】临近中午，你发现了一家半掩着门的地下诊所。里面亮着微弱的烛光，一个中年男人（老陈）正在整理医疗箱。他听到动静，抬起头冷冷地打量着你。", [
      { text: "推门进去，尝试拿出物资交易", action: () => {
          state.hp = 100; 
          applyEffect({ hunger: -10, san: 10 });
          renderScene("老陈收下了你的食物，帮你处理了伤口（回满生命），然后压低声音说：“最近城里有一拨穿白大褂的人，在抓活人做实验，离城西的旧工厂远点。”", [
            { text: "邀请老陈入队", action: () => { applyEffect({ team: "老陈" }); startDay1_Night(); } },
            { text: "道谢后独自离开", action: startDay1_Night }
          ]);
      }},
      { text: "在门外暗中观察", action: () => { 
          applyEffect({ san: -10 }); 
          renderScene("你躲在门外，看到老陈熟练地处理着一具变异尸体，动作冷酷。你感到一阵反胃，悄悄离开了。", [{text:"继续", action: startDay1_Night}]); 
      }},
      { text: "强行闯入抢劫（极度危险）", action: () => {
          if (Math.random() < 0.8) {
            applyEffect({ hp: -60 });
            renderScene("老陈反应极快，反手从抽屉里掏出一把手枪，一枪打中你的肩膀。你惨叫着逃出了地下诊所。", [{text:"继续", action: startDay1_Night}]);
          } else {
            applyEffect({ san: -30, hunger: 30, meds: true });
            renderScene("你凭借蛮力制服了老陈。你抢走了诊所里所有的物资和药品，心里沉甸甸的。", [{text:"继续", action: startDay1_Night}]);
          }
      }}
    ]);
  }

  function startDay1_Night() {
    applyEffect({ hunger: -10 });
    renderScene("【第一天·晚】夜幕降临，怪物和感染者开始活跃。你找到了一家破旧的汽车旅馆，大厅里弥漫着灰尘，你需要在这里熬过今晚。", [
      { text: "躲进一楼尽头的储藏室（安全保底）", action: () => { 
          applyEffect({ hp: 15, san: 5, hunger: state.team.length > 0 ? -10 : 0 }); 
          renderScene("储藏室的门锁还完好。你锁好门，吃了一点东西，靠在墙角安稳地睡了一觉。", [{text:"度过今晚", action: () => endDay(1)}]);
      }},
      { text: "探索二楼总统套房（可能有物资，但危险）", action: () => {
          if (Math.random() < 0.5) { 
            applyEffect({ hunger: 15 - (state.team.length > 0 ? 10 : 0), hp: 10 }); 
            renderScene("你找到了一个未开封的罐头，房间里没有异样。你饱餐一顿，安然入睡。", [{text:"度过今晚", action: () => endDay(1)}]); 
          } else {
            if (state.team.includes("老陈")) { 
              applyEffect({ hunger: -10 }); 
              renderScene("半夜，几只变异鼠从通风管窜出。老陈反应很快，用药箱砸跑了它们，你们一夜平安。", [{text:"度过今晚", action: () => endDay(1)}]); 
            } else { 
              applyEffect({ hp: state.hasWeapon ? -10 : -25, san: -10, hunger: -10 }); 
              renderScene("半夜你遭遇了变异鼠的袭击。你拼命驱赶它们，虽然没受重伤，但一晚上没合眼，精神极度疲惫。", [{text:"度过今晚", action: () => endDay(1)}]); 
            }
          }
      }}
    ]);
  }

  // ================= 第二天 =================
  function startDay2_Early() {
    applyEffect({ hunger: -10 });
    renderScene("【第二天·早】家里没吃的了，你来到废弃街区。左边是社区医院，可能有药品；右边是警察局，可能有武器。", [
      { text: "去社区医院找药", action: () => {
          if (Math.random() < 0.6) { 
            applyEffect({ hunger: 40, meds: true }); 
            renderScene("你在药房抽屉里找到了一些医疗包和抗生素，安全撤离。", [{text:"中午休息", action: startDay2_Mid}]); 
          } else {
            if (state.hasWeapon) { 
              applyEffect({ hp: -10, hunger: 40 }); 
              renderScene("你遭遇了感染者，用武器艰难击退了它们，受了点轻伤。", [{text:"中午休息", action: startDay2_Mid}]); 
            } else { 
              applyEffect({ hp: -20, infection: Math.random() < 0.3 }); 
              renderScene("你遭遇了感染者，逃跑时被抓伤了。", [{text:"中午休息", action: startDay2_Mid}]); 
            }
          }
      }},
      { text: "去警察局找武器", action: () => {
          if (Math.random() < 0.8) { 
            applyEffect({ hunger: 30 }); 
            renderScene("你撬开了门，在武器库找到了一件防弹背心（大幅减伤）。", [{text:"中午休息", action: startDay2_Mid}]); 
          } else { 
            applyEffect({ hp: -15, san: -10 }); 
            renderScene("你不小心触发了遗留的陷阱，被炸伤，耳朵嗡嗡作响。", [{text:"中午休息", action: startDay2_Mid}]); 
          }
      }},
      { text: "搜刮周边居民楼（稳妥，肯定有食物）", action: () => { 
          applyEffect({ hunger: 25, san: 5 }); 
          renderScene("你翻到了几罐午餐肉，吃得饱饱的，心里踏实了不少。", [{text:"中午休息", action: startDay2_Mid}]); 
      }}
    ]);
  }

  function startDay2_Mid() {
    applyEffect({ hunger: -10 });
    if (state.team.includes("老陈")) {
      renderScene("【第二天·中】休息时，你问老陈白房的事。老陈眼神躲闪：“他们不叫白房，只是外号。他们穿白大褂……对超能力有极其病态的研究。”突然他喃喃自语：“如果怪物能救人，还算怪物吗？”", [
        { text: "追问“你瞒了我什么？”", action: () => { 
            applyEffect({ san: -10 }); 
            renderScene("老陈猛地闭嘴，眼神变得极其警惕，你们之间的气氛变得有些冰冷。", [{text:"傍晚", action: startDay2_Night}]); 
        }},
        { text: "递给他一块干粮，什么都不问", action: () => { 
            applyEffect({ hunger: -5, san: 15 }); 
            renderScene("老陈愣了一下，接过干粮，苦笑着摇了摇头。你们之间的信任加深了。", [{text:"傍晚", action: startDay2_Night}]); 
        }}
      ]);
    } else {
      renderScene("【第二天·中】你孤身一人，在废弃的房间里休息。角落的收音机突然传出断断续续的广播：'……城西出现穿白色防护服的人，正在回收实验体……'广播随后中断。", [
        { text: "仔细修收音机，试图获取更多信息", action: () => { 
            applyEffect({ san: -10 }); 
            renderScene("你听到了一阵加密通话，里面提到了“脑垂体”和“实验体A”。你感到一阵毛骨悚然。", [{text:"傍晚", action: startDay2_Night}]); 
        }},
        { text: "关掉收音机，眼不见为净", action: () => { 
            applyEffect({ hunger: 10, san: 5 }); 
            renderScene("你安心吃完了干粮，保持了心态平稳。", [{text:"傍晚", action: startDay2_Night}]); 
        }}
      ]);
    }
  }

  function startDay2_Night() {
    applyEffect({ hunger: -10 });
    renderScene("【第二天·晚】你穿过小巷，发现了一辆翻倒的黑色装甲车。你摸进去，刚拿到一份带有白房标志的文件，外面就传来了沉重的脚步声——两个穿白色防护服的人正在靠近！", [
      { text: "立刻躲进装甲车底部的缝隙", action: () => {
          if (Math.random() < 0.6) { 
            applyEffect({ san: -10 }); 
            state.flags.hasWhiteRoomFile = true; 
            renderScene("白房人员检查了一圈后离开了。你安全脱身，带走了文件。", [{text:"度过今晚", action: () => endDay(2)}]); 
          } else { 
            applyEffect({ hp: state.team.includes("老陈") ? -20 : -25 }); 
            state.flags.hasWhiteRoomFile = true; 
            renderScene("你弄出了声响，被他们用电击枪拖出来一顿毒打。他们抢走了部分物资后离开。", [{text:"度过今晚", action: () => endDay(2)}]); 
          }
      }},
      { text: "趁他们没靠近，从后门溜走", action: () => { 
          applyEffect({ hunger: -20, san: -5 }); 
          state.flags.hasWhiteRoomFile = true; 
          renderScene("你从后门溜走，拿走了文件，但跑得太急，弄丢了部分口粮。", [{text:"度过今晚", action: () => endDay(2)}]); 
      }},
      { text: "拿出手里的武器，直接和他们拼了！", action: () => {
          if (state.team.includes("老陈")) { 
            applyEffect({ hp: -20, san: -15 }); 
            renderScene("老陈冲出来替你挡下了致命一击。你带着重伤的老陈拼死逃了出来。", [{text:"度过今晚", action: () => endDay(2)}]); 
          } else { 
            applyEffect({ hp: -35, san: -20 }); 
            renderScene("你根本不是他们的对手，被打成重伤，拼死才逃脱。", [{text:"度过今晚", action: () => endDay(2)}]); 
          }
      }}
    ]);
  }

  // ================= 第三天 =================
  function startDay3_Early() {
    applyEffect({ hunger: -10 });
    renderScene("【第三天·早】附近的物资见底了，你们冒险前往边缘的大型地下仓库。刚摸进去，深处突然传来金属碰撞的巨响和呼救声。", [
      { text: "立刻隐蔽，观察情况", action: () => { 
          applyEffect({ san: -5 }); 
          renderScene("你躲在暗处，发现三个暴徒在抢劫一个女孩。女孩大腿被刺伤，暴徒抢走食物后离开。你等他们走远才敢出来，女孩已经不见了。", [{text:"继续探索", action: startDay3_Mid}]); 
      }},
      { text: "直接冲出去，试图赶走暴徒！", action: () => { 
          let dmg = state.hasWeapon ? -15 : -30; 
          applyEffect({ hp: dmg, hunger: 20 }); 
          renderScene("你冲出去和暴徒搏斗。虽然受了伤，但成功赶走了他们，救下了一个女孩。这里不能久留，你迅速撤离。", [{text:"继续探索", action: startDay3_Mid}]); 
      }},
      { text: "趁乱绕过去，先去深处搜刮物资", action: () => { 
          applyEffect({ hunger: 25, san: -15 }); 
          renderScene("你无视了呼救，潜入深处拿到了罐头。出来时女孩已经不见了。你带着沉甸甸的物资和愧疚感离开了。", [{text:"继续探索", action: startDay3_Mid}]); 
      }}
    ]);
  }

  function startDay3_Mid() {
    applyEffect({ hunger: -10 });
    renderScene("【第三天·中】为了躲避大路，你们走了废墟通道。你因为体力不支，突然脚下一空，踩中了猎人布置的陷阱！一个浑身是伤的少女（小雅）举着木矛对准你们。", [
      { text: "举起手，尝试给她包扎伤口", action: () => {
          if (state.hasMeds) {
             if (Math.random() < 0.5) { 
               applyEffect({ team: "小雅" }); 
               renderScene("小雅放下了武器，感激地看着你。她说自己熟悉野外生存，能帮你们防陷阱。小雅加入了队伍。", [{text:"夜晚", action: startDay3_Night}]); 
             } else { 
               applyEffect({ hp: -15 }); 
               renderScene("她以为你要抢东西，木矛刺中了你的手臂，然后转身逃跑。", [{text:"夜晚", action: startDay3_Night}]); 
             }
          } else { 
            applyEffect({ san: -5 }); 
            renderScene("你没有医疗包，只能摊开手表示没有恶意。她犹豫了一下，依然戒备地跑了。", [{text:"夜晚", action: startDay3_Night}]); 
          }
      }},
      { text: "让老陈去交涉（需老陈在场）", action: () => {
          if (state.team.includes("老陈")) { 
            applyEffect({ team: "小雅" }); 
            renderScene("老陈走过去，温和地安抚了她。小雅放下了防备，决定加入你们。", [{text:"夜晚", action: startDay3_Night}]); 
          } else { 
            renderScene("你大喊老陈的名字，但没人回应。小雅趁机跑了。", [{text:"夜晚", action: startDay3_Night}]); 
          }
      }},
      { text: "趁机抢劫她", action: () => { 
          applyEffect({ hunger: 20, san: -25 }); 
          renderScene("你狠下心，抢走了她辛苦攒下的水和肉。她绝望地看了你一眼，一瘸一拐地逃走。", [{text:"夜晚", action: startDay3_Night}]); 
      }},
      { text: "无视她，绕路走开", action: () => { 
          applyEffect({ san: -5 }); 
          renderScene("你们没有理她，默默绕路离开了。", [{text:"夜晚", action: startDay3_Night}]); 
      }}
    ]);
  }

  function startDay3_Night() {
    applyEffect({ hunger: -10 });
    let text = "【第三天·晚】夜幕降临，你们在废弃的防空洞过夜。";
    let opts = [{text:"度过今晚", action: () => endDay(3)}];
    
    if (state.flags.hasWhiteRoomFile) {
      text = "【第三天·晚】你借着火光翻看白房文件，上面写着：'A级样本已脱离控制，疑似向本区域移动'。就在这时，防空洞外传来凄厉的惨叫和沉重的踩踏声！";
      opts = [
        { text: "立刻用杂物堵死大门", action: () => { 
            applyEffect({san: -10, hunger: -5}); 
            renderScene("那个沉重的怪物在洞口徘徊了很久才离开，你们一晚上都没合眼。", [{text:"度过今晚", action: () => endDay(3)}]); 
        }},
        { text: "让小雅去探探情况（需小雅）", action: () => {
            if (state.team.includes("小雅")) { 
              applyEffect({san: -15}); 
              renderScene("小雅溜出去看了一眼，回来脸色惨白：“是个长满鳞片的怪物，它一巴掌把汽车拍扁了。”", [{text:"度过今晚", action: () => endDay(3)}]); 
            } else { 
              applyEffect({hp: -5, san: -15}); 
              renderScene("你透过缝隙偷看，那东西绝对不是你现在的武器能对付的。它没发现你们。", [{text:"度过今晚", action: () => endDay(3)}]); 
            }
        }}
      ];
    }
    renderScene(text, opts);
  }

  // ================= 第四天 =================
  function startDay4_Early() {
    applyEffect({ hunger: -10 });
    renderScene("【第四天·早】今天出奇的安静，连平时游荡的感染者都不见了踪影。你们在一家废弃的便利店搜刮，发现似乎有人在暗处盯着你们。", [
      { text: "提高警惕，放弃搜刮绕路", action: () => { 
          applyEffect({ hp: -5, hunger: -5 }); 
          renderScene("你们放弃了便利店，绕了很远的路。虽然没有遇到危险，但白白消耗了体力，最终走到了一片开阔的废弃广场。", [{text:"继续", action: startDay4_Mid}]); 
      }},
      { text: "不管那么多，加快速度搜刮", action: () => {
          if (Math.random() < 0.6) { 
            applyEffect({ hunger: 20 }); 
            renderScene("你们拿到了饼干，但刚出门，就被几个人影逼向了广场。", [{text:"继续", action: startDay4_Mid}]); 
          } else { 
            applyEffect({ hp: -15, hunger: -15 }); 
            renderScene("你们刚拿东西，就被几个蒙面人从暗处偷袭，食物被抢走，还被赶向广场。", [{text:"继续", action: startDay4_Mid}]); 
          }
      }}
    ]);
  }

  function startDay4_Mid() {
    applyEffect({ hunger: -10 });
    renderScene("【第四天·中】广场高处站着一个穿黑色兜帽的男人。他说：'如果我说，白房能让你变成不再惧怕感染和饥饿的超能力者呢？'", [
      { text: "直接追问“代价是什么？”", action: () => { 
          applyEffect({ san: -10 }); 
          renderScene("他笑了笑：'一点小小的身体改造。'随后扔下一张白房地图便离开了。", [{text:"夜晚", action: startDay4_Night}]); 
      }},
      { text: "拒绝他：“我宁可当普通人饿死。”", action: () => { 
          applyEffect({ san: 10 }); 
          renderScene("他冷冷地说：'那是你的选择。但你的同伴未必这么想。'随后扔下地图走了。", [{text:"夜晚", action: startDay4_Night}]); 
      }},
      { text: "假装答应，试图偷袭他", action: () => {
          if (Math.random() < 0.8) { 
            applyEffect({ hp: -25 }); 
            renderScene("他看穿了你的动作，用高压电击棍瞬间将你打倒在地，扔下地图走了。", [{text:"夜晚", action: startDay4_Night}]); 
          } else { 
            applyEffect({ san: -15, meds: true }); 
            renderScene("你侥幸击倒了他，在他身上搜到了一种发光药剂。但地图掉在了地上。", [{text:"夜晚", action: startDay4_Night}]); 
          }
      }}
    ]);
  }

  function startDay4_Night() {
    applyEffect({ hunger: -10 });
    renderScene("【第四天·晚】夜幕降临，无论你们怎么绕路，最终都走到了城南废弃地铁站附近。入口亮着一盏微弱的紫外线白灯，像是某种怪物的诱饵。", [
      { text: "鼓起勇气，走入地铁站", action: () => { 
          applyEffect({ san: -15 }); 
          state.flags.joinWhiteRoom = true; 
          renderScene("你见到了兜帽男，他指着一个装满绿色液体的注射器：'打下去，你就不再是任人宰割的凡人。'", [{text:"度过今晚", action: () => endDay(4)}]); 
      }},
      { text: "远远看一眼，立刻转身逃跑", action: () => { 
          applyEffect({ hunger: -15, hp: -5 }); 
          state.flags.joinWhiteRoom = false; 
          renderScene("你们连夜跑到了很远的地方扎营。虽然极度疲惫，但觉得离这帮疯子越远越好。", [{text:"度过今晚", action: () => endDay(4)}]); 
      }}
    ]);
  }

   // ================= 第五天双线分支 =================

  function startDay5_Wilderness() {
    applyEffect({ hunger: -10 });
    renderScene("【第五天·荒野】昨晚你们逃离了白房。今天下起了带有腐蚀性的酸雨，你们不仅没食物，还遇到了一群发狂的感染者，被逼到了悬崖边。", [
      { text: "冒着酸雨，强行冲进前方的防空洞", action: () => {
          applyEffect({ hp: -15 });
          renderScene("你们冲进防空洞，惊动了里面冬眠的变异兽，它咆哮着向你们扑来！", [
            { text: "迎战（拥有武器会轻松很多）", action: () => {
                if (state.hasWeapon) { applyEffect({ hunger: 30 }); renderScene("你挥舞着菜刀击杀了变异兽，获得了大量的兽肉，足够吃好几天了。", [{text:"继续", action: startDay5_Mid_Wilderness}]); }
                else { applyEffect({ hp: -20 }); renderScene("你赤手空拳与变异兽搏斗，虽然惨胜，但身上又添了几道新伤。", [{text:"继续", action: startDay5_Mid_Wilderness}]); }
            }},
            { text: "让同伴引开它，你趁机搜刮", action: () => {
                if (state.team.length > 0) { applyEffect({san: -10}); renderScene("同伴拼命引开了怪物，你在洞里拿到了物资。虽然大家都活下来了，但你心里很不是滋味。", [{text:"继续", action: startDay5_Mid_Wilderness}]); }
                else { applyEffect({hp: -30}); renderScene("你试图自己引开它，却被狠狠抓了一爪子，摔倒在地。", [{text:"继续", action: startDay5_Mid_Wilderness}]); }
            }}
          ]);
      }},
      { text: "寻找其他避雨点，稳妥为主", action: () => { 
          applyEffect({ hunger: -10, hp: -5, san: -5 }); 
          renderScene("你们只找到一个漏雨的破帐篷。因为躲避不及，皮肤被酸雨灼伤了一点，你们挤在一起瑟瑟发抖。", [{text:"继续", action: startDay5_Mid_Wilderness}]); 
      }}
    ]);
  }

  function startDay5_Mid_Wilderness() {
    applyEffect({ hunger: -10 });
    renderScene("【第五天·中】中午，你们在废墟中穿行，突然被一群将你们逼到绝路的发狂感染者包围。退无可退！", [
      { text: "挡在同伴面前，准备用肉体硬抗", action: () => {
          if (state.hasWeapon || state.san > 50) {
            applyEffect({ san: -20 });
            state.flags.hiddenPower = "肉体强化/治愈";
            renderScene("绝境中，你的大脑一阵刺痛，一股无形的力量从体内爆发。你觉醒了属于你自己的超能力，瞬间撕裂了感染者！（你已经不是凡人了）", [{text:"夜晚", action: startDay5_Night_Wilderness}]);
          } else {
            applyEffect({ hp: -35 });
            renderScene("你被感染者咬得遍体鳞伤，就在快要断气时，你爆发了求生的本能，侥幸被同伴救下。", [{text:"夜晚", action: startDay5_Night_Wilderness}]);
          }
      }},
      { text: "拉着同伴跳下悬崖（下方是河流）", action: () => { 
          applyEffect({ hp: -15, hunger: -20 }); 
          renderScene("你们抱在一起跳入湍急的河流。虽然侥幸活命，但背包被水冲走，丢失了大量物资。", [{text:"夜晚", action: startDay5_Night_Wilderness}]); 
      }}
    ]);
  }

  function startDay5_Night_Wilderness() {
    applyEffect({ hunger: -10 });
    let text = "【第五天·晚】你们在山洞里生起了火。虽然什么都没有，但活下来了。";
    if (state.team.includes("老陈")) text += "老陈默默拿出白天省下的半块饼干递给你。";
    if (state.team.includes("小雅")) text += "小雅用干草给你铺了一个舒服的床铺。";
    
    renderScene(text, [
      { text: "和同伴分享心情，互相依靠", action: () => { 
          if(state.team.length>0) applyEffect({ san: 20 }); 
          renderScene("你们相视一笑，这世道还有人陪着真好。", [{text:"度过今晚", action: () => endDay(5)}]); 
      }},
      { text: "独自冥想，感受体内的异样", action: () => { 
          applyEffect({ san: 10 }); 
          renderScene("你闭上眼睛，开始尝试控制今天觉醒的微弱力量。", [{text:"度过今晚", action: () => endDay(5)}]); 
      }}
    ]);
  }

  function startDay5_WhiteRoom() {
    applyEffect({ hunger: -10 });
    renderScene("【第五天·白房】你走进了地铁站。兜帽男没有废话，直接让人把你绑在手术台上，给你注射了绝命转化药剂。你开始剧烈抽搐，痛不欲生！", [
      { text: "咬紧牙关，接受注射", action: () => {
          applyEffect({ hp: -30, san: -15 });
          if (state.hasMeds) { 
            applyEffect({ hp: 10 }); 
            renderScene("你随身携带的抗生素稍微减缓了你的痛苦，你挺过了第一波排异。", [{text:"继续", action: startDay5_Mid_WhiteRoom}]); 
          } else { 
            renderScene("你痛得几乎要咬碎牙齿，意识开始模糊。", [{text:"继续", action: startDay5_Mid_WhiteRoom}]); 
          }
      }},
      { text: "拼命挣扎，试图逃跑", action: () => { 
          applyEffect({ hp: -40 }); 
          state.flags.hasCollar = true; 
          renderScene("你被白房守卫用高压电击棍击晕，强行注射，并在脖子上戴上了一个限制项圈。", [{text:"继续", action: startDay5_Mid_WhiteRoom}]); 
      }}
    ]);
  }

  function startDay5_Mid_WhiteRoom() {
    applyEffect({ hunger: -10 });
    let text = "【第五天·中】药剂在你体内翻江倒海，你感觉自己快要死了。兜帽男冷冷地说：'浓度不够，你需要催化剂。'";
    let opts = [];
    
    if (state.team.length > 0) {
      text += "他指着你奄奄一息的同伴：'把他们的脑垂体交出来做提取液，你立刻就能停止痛苦，获得力量。'";
      opts = [
        { text: "交出同伴，换取力量（极度邪恶）", action: () => { 
            applyEffect({ san: -50 }); 
            state.team = []; 
            state.flags.hiddenPower = "深渊之力"; 
            renderScene("同伴被拖走。你喝下提取液，痛苦瞬间消失。你获得了强大的异能，但你永远失去了灵魂。", [{text:"夜晚", action: startDay5_Night_WhiteRoom}]); 
        }},
        { text: "宁死不从，试图救走同伴", action: () => { 
            applyEffect({ hp: -40, san: -30 }); 
            state.team = []; 
            renderScene("你们被毒打。同伴为了掩护你，撞向了白房的枪口牺牲。你带着重伤拼死逃出了实验室。", [{text:"夜晚", action: startDay5_Night_WhiteRoom}]); 
        }}
      ];
    } else {
      text += "因为你没有同伴，他把你踹出实验室：'去外面抓个无辜的人回来，否则你就等着变成怪物吧。'";
      opts = [
        { text: "抓一个幸存者回来", action: () => { 
            applyEffect({ san: -30 }); 
            state.flags.hiddenPower = "深渊之力"; 
            renderScene("你杀了一个无辜者，你活了下来，觉醒了强大的异能。", [{text:"夜晚", action: startDay5_Night_WhiteRoom}]); 
        }},
        { text: "放走幸存者，自己承受反噬", action: () => { 
            applyEffect({ hp: -40, san: 10 }); 
            renderScene("你放走了人，白房没杀你，但你的身体因缺乏催化剂而濒临崩溃。", [{text:"夜晚", action: startDay5_Night_WhiteRoom}]); 
        }}
      ];
    }
    renderScene(text, opts);
  }

  function startDay5_Night_WhiteRoom() {
    applyEffect({ hunger: -10 });
    renderScene("【第五天·晚】夜晚，你躺在白房提供的干净床铺上。这里有充足的食物，有暖气。但你的心像死了一样寂静。", [
      { text: "吃下白房提供的丰盛晚餐", action: () => { 
          state.hunger = 100; 
          applyEffect({ san: -10 }); 
          renderScene("每一口都像在吃人血馒头，你的手在发抖。", [{text:"度过今晚", action: () => endDay(5)}]); 
      }},
      { text: "在深夜里研究白房文件，寻找弱点", action: () => { 
          applyEffect({ san: 10 }); 
          renderScene("你暗中立誓，如果获得力量，一定要把白房连根拔起。", [{text:"度过今晚", action: () => endDay(5)}]); 
      }}
    ]);
  }

  // ================= 第六天 =================

  function startDay6_Wilderness() {
    applyEffect({ hunger: -10 });
    renderScene("【第六天·荒野】白房的外围人员追杀你们。经过昨天的觉醒，你们不再束手就擒。", [
      { text: "利用觉醒能力/战术正面反击", action: () => { 
          applyEffect({ san: -10, hunger: 20 }); 
          renderScene("你利用异能和地形，反杀了追兵，抢夺了他们的高级装备和口粮。", [{text:"夜晚", action: startDay6_Night_Wilderness}]); 
      }},
      { text: "利用废墟地形布置陷阱", action: () => { 
          if(state.team.includes("小雅")){ 
            applyEffect({hunger: 15}); 
            renderScene("小雅布置了极其精妙的陷阱，你们完美伏击了追兵，没有受伤。", [{text:"夜晚", action: startDay6_Night_Wilderness}]); 
          } else { 
            applyEffect({hp: -15}); 
            renderScene("陷阱不够完美，你受了点伤才解决他们。", [{text:"夜晚", action: startDay6_Night_Wilderness}]); 
          } 
      }}
    ]);
  }

  function startDay6_Night_Wilderness() {
    applyEffect({ hunger: -10 });
    renderScene("【第六天·晚】你们找到了白房在城市边缘的废弃观测站外围。明天就是最终决战。", [
      { text: "好好休息，养精蓄锐", action: () => endDay(6) }
    ]);
  }

  function startDay6_WhiteRoom() {
    applyEffect({ hunger: -10 });
    renderScene("【第六天·白房】你的异能副作用爆发，脑海中不断响起伊芙博士的声音。她命令你去清理城南的暴徒。", [
      { text: "服从命令，去清理暴徒", action: () => { 
          applyEffect({ san: -20, hunger: 20 }); 
          renderScene("你大开杀戒，获得了博士的信任和大量补给。", [{text:"夜晚", action: startDay6_Night_WhiteRoom}]); 
      }},
      { text: "抗拒命令，承受项圈电击", action: () => { 
          applyEffect({ hp: -30, san: 10 }); 
          renderScene("你被项圈电得皮开肉绽，但放走了几个无辜者。", [{text:"夜晚", action: startDay6_Night_WhiteRoom}]); 
      }}
    ]);
  }

  function startDay6_Night_WhiteRoom() {
    applyEffect({ hunger: -10 });
    renderScene("【第六天·晚】白房的广播彻夜响着。明天，你就要去核心实验室见伊芙博士了。", [
      { text: "带着决绝的心入睡", action: () => endDay(6) }
    ]);
  }

  // ================= 第七天（大结局） =================

  function startDay7_Wilderness() {
    applyEffect({ hunger: -10 });
    renderScene("【第七天·决战】你们潜入观测站。大屏幕上出现伊芙博士的录像：“感谢你帮我完成了边缘测试。”", [
      { text: "摧毁系统，带走资料", action: () => {
          if (state.team.length > 0 && state.flags.hiddenPower !== "") {
             showEnd("【人类的曙光】", "你带着同伴摧毁了观测站。你的觉醒力量成为了末世的传说，你们建立了一个真正的避难所。");
          } else {
             showEnd("【孤独的守望者】", "你摧毁了观测站，但同伴已死。你精神崩溃，变成了游荡在城市边缘的神秘怪物。");
          }
      }},
      { text: "触发警报，强攻实验室", action: () => {
          if (state.hp < 30) { showEnd("【实验品 0 号】", "你重伤濒死。伊芙博士亲自出场，按下一个按钮，你被强行传送带走，面临更恐怖的切片研究。"); }
          else if (state.san < 40) { showEnd("【孤独的守望者】", "你失控杀光了所有人，最后在迷茫中走向了荒野。"); }
          else { showEnd("【人类的曙光】", "你强攻成功，杀死了伊芙博士，终结了白房的阴谋。"); }
      }}
    ]);
  }

  function startDay7_WhiteRoom() {
    applyEffect({ hunger: -10 });
    renderScene("【第七天·决战】你冲进核心实验室，见到伊芙博士。她狂热地说：“我需要收集最强的异能基因，融合成‘新神’。你，就是最后一块拼图。”", [
      { text: "杀死博士，夺取所有基因", action: () => {
          if (state.san < 40) { showEnd("【同归于尽】", "你彻底失控变异，碾碎了博士，随后自己也因基因崩溃化为血水。"); }
          else { showEnd("【新世界的卡密】", "你杀死了博士，成为唯一的完美超能力者。你统治了废墟，但也成了真正的孤家寡人。"); }
      }},
      { text: "协助同伴拆弹，拼死反抗", action: () => {
          if (state.team.length > 0) { showEnd("【迟来的救赎】", "同伴帮你拆了炸弹，牺牲了自己。你暴走杀死了博士，摧毁白房。你活了下来，但余生都在赎罪。"); }
          else { showEnd("【同归于尽】", "你独自反抗，引爆了实验室核心，与白房同归于尽。"); }
      }},
      { text: "使用全家福唤醒理智（需携带照片）", action: () => {
          if (state.hasPhoto && state.san > 60) { showEnd("【最后的幸存者】", "照片唤回了你的人性。你引爆核心后逃离了白房，失去了所有能力，变回普通人独自走在夕阳下。"); }
          else { showEnd("【实验品 0 号】", "你试图抵抗，但精神不够坚定，最终成了伊芙博士的终极标本。"); }
      }}
    ]);
  }

  // ================= 核心底层逻辑（结算与按钮） =================

  function endDay(dayNumber) {
    applyEffect({ hp: 10, hunger: -5 }, false);
    if (state.team.includes("老陈")) applyEffect({ hp: 10 }, false);
    if (state.team.includes("小雅")) applyEffect({ san: 10 }, false);
    if (state.hasPhoto) applyEffect({ san: 10 }, false);
    
    if (state.infectionTimer > 0) {
      applyEffect({ hp: -10 }, false);
      state.infectionTimer--;
    }

    if (checkDeath()) return;

    if (dayNumber === 1) { state.day = 2; startDay2_Early(); }
    else if (dayNumber === 2) { state.day = 3; startDay3_Early(); }
    else if (dayNumber === 3) { state.day = 4; startDay4_Early(); }
    else if (dayNumber === 4) { 
      state.day = 5; 
      if (state.flags.joinWhiteRoom) startDay5_WhiteRoom();
      else startDay5_Wilderness();
    }
    else if (dayNumber === 5) { 
      state.day = 6; 
      if (state.flags.joinWhiteRoom) startDay6_WhiteRoom();
      else startDay6_Wilderness();
    }
    else if (dayNumber === 6) { 
      state.day = 7; 
      if (state.flags.joinWhiteRoom) startDay7_WhiteRoom();
      else startDay7_Wilderness();
    }
  }

  // 绑定重启按钮和开始按钮
  $("#btnStartGame").onclick = startPrologue;
  $("#btnRestart").onclick = () => {
    if (musicInterval) clearInterval(musicInterval);
    $("#page-end").classList.remove("active");
    $("#page-start").classList.add("active");
  };

})();
