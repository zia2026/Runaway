(function () {
  "use strict";

  // ================= 玩家状态 =================
  let state = {
    hp: 100, san: 100, hunger: 60,
    hasWeapon: false, hasMeds: false, hasPhoto: false,
    team: [], // 最多放两个人名字
    day: 1,
    flags: { hasWhiteRoomFile: false }, // 记录是否拿到白房文件
    infectionTimer: 0 // 大于0表示感染，每晚扣血
  };

  const $ = (sel) => document.querySelector(sel);

  // ================= 核心引擎 =================
  function updateUI() {
    $("#stat-hp").textContent = Math.max(0, state.hp);
    $("#stat-san").textContent = Math.max(0, state.san);
    $("#stat-hunger").textContent = Math.max(0, state.hunger);
    
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
    if (state.hp <= 20) return showEnd("你倒下了", "失血过多和伤痛让你失去了意识，你倒在了冰冷的废墟中。末世不相信眼泪。");
    if (state.san <= 20) return showEnd("精神崩溃", "无尽的恐惧和绝望压垮了你，你疯了。你在狂笑中走向了感染者群。");
    if (state.hunger <= 20) return showEnd("饥饿而死", "胃里像有一团火在烧，你连走路的力气都没有了。你最终没能熬过去。");
    return false;
  }

  function applyEffect(effects) {
    if (effects.hp) state.hp += effects.hp;
    if (effects.san) state.san += effects.san;
    if (effects.hunger) state.hunger += effects.hunger;
    if (effects.weapon) state.hasWeapon = true;
    if (effects.meds) state.hasMeds = true;
    if (effects.infection) state.infectionTimer = 3;
    if (effects.team && state.team.length < 2 && !state.team.includes(effects.team)) {
      state.team.push(effects.team);
    }
    updateUI();
    return checkDeath();
  }

  function showEnd(title, desc) {
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
      btn.onclick = () => opt.action();
      container.appendChild(btn);
    });
  }

  // ================= 第一天剧情 =================
  function startPrologue() {
    state = { hp: 100, san: 100, hunger: 60, hasWeapon: false, hasMeds: false, hasPhoto: false, team: [], day: 1, flags: {}, infectionTimer: 0 };
    updateUI();
    $("#page-start").classList.remove("active");
    $("#page-game").classList.add("active");
    
    renderScene("水龙头已经拧不出一滴水，窗外传来凄厉的惨叫。你拿起背包，准备推开防盗门。只能带一件东西防身：", [
      { text: "【生锈菜刀】（获得基础武力）", action: () => { applyEffect({weapon: true}); startDay1_Early(); } },
      { text: "【半盒抗生素】（可清除感染）", action: () => { applyEffect({meds: true}); startDay1_Early(); } },
      { text: "【全家福照片】（理智上限高，每日回理智）", action: () => { state.hasPhoto = true; state.san = 80; state.hunger = 50; updateUI(); startDay1_Early(); } }
    ]);
  }

  function startDay1_Early() {
    applyEffect({ hunger: -10 });
    renderScene("【第一天·早】你来到十字路口，左边是超市（危险），右边是地铁站（安全）。", [
      { text: "去超市搜刮", action: () => {
          if (Math.random() < 0.5) {
            applyEffect({ hunger: 40 });
            renderScene("运气不错，你找到了一些罐头，安全离开。", [{text:"前往地下诊所", action: startDay1_Mid}]);
          } else {
            if (state.hasWeapon) {
              applyEffect({ hp: -15, hunger: 40 });
              renderScene("你砍翻了感染者，但被划伤了。获得了一些物资。", [{text:"前往地下诊所", action: startDay1_Mid}]);
            } else {
              let infect = Math.random() < 0.3;
              applyEffect({ hp: -35, hunger: 40, infection: infect });
              renderScene("你被感染者抓伤，狼狈逃跑。" + (infect ? "【感染倒计时开始】" : ""), [{text:"前往地下诊所", action: startDay1_Mid}]);
            }
          }
      }},
      { text: "去地铁站", action: () => {
          applyEffect({ hunger: 20, san: -15 });
          renderScene("你找到了水，但墙上的极端图腾让你感到不安。", [{text:"前往地下诊所", action: startDay1_Mid}]);
      }},
      { text: "穿过小巷（安全但无收获）", action: () => {
          applyEffect({ hunger: -10, hp: -5 });
          renderScene("小巷很安静，但你饿着肚子赶路消耗了体力。", [{text:"前往地下诊所", action: startDay1_Mid}]);
      }}
    ]);
  }

  function startDay1_Mid() {
    applyEffect({ hunger: -10 });
    renderScene("【第一天·中】你来到一家地下诊所，里面有个中年男人（老陈）正在整理医疗箱。", [
      { text: "推门进去，尝试交易", action: () => {
          state.hp = 100; 
          applyEffect({ hunger: -15, san: 10 });
          let opts = [
            { text: "邀请老陈入队", action: () => { applyEffect({ team: "老陈" }); startDay1_Night(); } },
            { text: "独自离开", action: startDay1_Night }
          ];
          renderScene("老陈收了你的食物，帮你包扎了伤口，并透露了白房组织的情报。", opts);
      }},
      { text: "在门外观察离开", action: () => { applyEffect({ san: -10 }); startDay1_Night(); }},
      { text: "强行抢劫（极度危险）", action: () => {
          if (Math.random() < 0.8) {
            applyEffect({ hp: -60 });
            renderScene("老陈拔枪反击，你中枪了，被他赶了出来。", [{text:"继续", action: startDay1_Night}]);
          } else {
            applyEffect({ san: -30, hunger: 30, meds: true });
            renderScene("你制服了老陈，抢走了物资，心里沉甸甸的。", [{text:"继续", action: startDay1_Night}]);
          }
      }}
    ]);
  }

  function startDay1_Night() {
    applyEffect({ hunger: -10 });
    renderScene("【第一天·晚】夜幕降临，你来到一家破旧的汽车旅馆。", [
      { text: "躲进安全的储藏室", action: () => {
          applyEffect({ hp: 15, san: 5, hunger: state.team.length > 0 ? -20 : 0 });
          endDay(1);
      }},
      { text: "去总统套房搏一搏", action: () => {
          if (Math.random() < 0.5) {
            applyEffect({ hunger: 15 - (state.team.length > 0 ? 20 : 0), hp: 10 });
            renderScene("你找到了罐头，安然入睡。", [{text:"度过今晚", action: () => endDay(1)}]);
          } else {
            if (state.team.includes("老陈")) {
              applyEffect({ hunger: -20 });
              renderScene("半夜有变异鼠出没，老陈帮你赶走了它们。", [{text:"度过今晚", action: () => endDay(1)}]);
            } else {
              applyEffect({ hp: state.hasWeapon ? -10 : -25, san: -10, hunger: -10 });
              renderScene("半夜遇袭，你苦战了一番。", [{text:"度过今晚", action: () => endDay(1)}]);
            }
          }
      }}
    ]);
  }

  // ================= 第二天剧情 =================
  function startDay2_Early() {
    applyEffect({ hunger: -10 });
    renderScene("【第二天·早】家里没吃的了，你来到废弃街区。左边是社区医院，右边是警察局。", [
      { text: "去社区医院", action: () => {
          if (Math.random() < 0.6) {
            applyEffect({ hunger: 15, meds: true });
            renderScene("你安全地找到了医疗包和抗生素。", [{text:"中午休息", action: startDay2_Mid}]);
          } else {
            if (state.hasWeapon) {
              applyEffect({ hp: -10, hunger: 15 });
              renderScene("你遭遇了感染者，用武器击退了他们，受了点伤。", [{text:"中午休息", action: startDay2_Mid}]);
            } else {
              applyEffect({ hp: -20, infection: Math.random() < 0.3 });
              renderScene("你遭遇了感染者，逃跑时受了伤。", [{text:"中午休息", action: startDay2_Mid}]);
            }
          }
      }},
      { text: "去警察局", action: () => {
          if (Math.random() < 0.8) {
            applyEffect({ hunger: 10 });
            renderScene("你撬开了门，找到了一件防弹背心（减伤）。", [{text:"中午休息", action: startDay2_Mid}]);
          } else {
            applyEffect({ hp: -15, san: -10 });
            renderScene("你触发了陷阱，被爆炸波及。", [{text:"中午休息", action: startDay2_Mid}]);
          }
      }},
      { text: "搜刮居民楼（稳妥）", action: () => {
          applyEffect({ hunger: 25, san: 5 });
          renderScene("你翻到了午餐肉，吃得很饱。", [{text:"中午休息", action: startDay2_Mid}]);
      }}
    ]);
  }

  function startDay2_Mid() {
    applyEffect({ hunger: -10 });
    if (state.team.includes("老陈")) {
      renderScene("【第二天·中】休息时，你问老陈白房的事。老陈喃喃自语：'如果怪物能救人，还算怪物吗？'", [
        { text: "追问“你瞒了我什么”", action: () => {
            applyEffect({ san: -10 });
            renderScene("老陈闭嘴了，眼神极其警惕。", [{text:"傍晚", action: startDay2_Night}]);
        }},
        { text: "递给他一块饼干，什么都不问", action: () => {
            applyEffect({ hunger: -5, san: 15 });
            renderScene("老陈愣了一下，苦笑，你们之间的信任加深了。", [{text:"傍晚", action: startDay2_Night}]);
        }}
      ]);
    } else {
      renderScene("【第二天·中】你孤身一人，收音机里传出广播：'……城西出现穿白色防护服的人，正在回收实验体……'广播随后中断。", [
        { text: "修收音机获取更多信息", action: () => {
            applyEffect({ san: -10 });
            renderScene("你听到了一阵加密通话，似乎提到了脑垂体和实验体A。", [{text:"傍晚", action: startDay2_Night}]);
        }},
        { text: "关掉收音机，不听了", action: () => {
            applyEffect({ hunger: 10, san: 5 });
            renderScene("你安心吃完了干粮，保持了心态平稳。", [{text:"傍晚", action: startDay2_Night}]);
        }}
      ]);
    }
  }

  function startDay2_Night() {
    applyEffect({ hunger: -10 });
    renderScene("【第二天·晚】你发现了一辆翻倒的装甲车，刚摸进去拿到一份白房文件，外面就传来了脚步声！", [
      { text: "躲进车底缝隙", action: () => {
          if (Math.random() < 0.6) {
            applyEffect({ san: -10 });
            state.flags.hasWhiteRoomFile = true;
            renderScene("你安全脱身，带走了文件。", [{text:"度过今晚", action: () => endDay(2)}]);
          } else {
            applyEffect({ hp: state.team.includes("老陈") ? -20 : -25 });
            state.flags.hasWhiteRoomFile = true;
            renderScene("你被发现拖出，挨了一顿毒打。", [{text:"度过今晚", action: () => endDay(2)}]);
          }
      }},
      { text: "趁没靠近，从后门溜走", action: () => {
          applyEffect({ hunger: -20, san: -5 });
          state.flags.hasWhiteRoomFile = true;
          renderScene("你拿走了文件，但跑丢了一些口粮。", [{text:"度过今晚", action: () => endDay(2)}]);
      }},
      { text: "拿武器和他们拼了！", action: () => {
          if (state.team.includes("老陈")) {
            applyEffect({ hp: -20, san: -15 });
            renderScene("老陈替你挡了致命一击，深受重伤，你带着他逃了出来。", [{text:"度过今晚", action: () => endDay(2)}]);
          } else {
            applyEffect({ hp: -35, san: -20 });
            renderScene("你被打成重伤，拼死才逃脱。", [{text:"度过今晚", action: () => endDay(2)}]);
          }
      }}
    ]);
  }

  // ================= 第三天剧情 =================
  function startDay3_Early() {
    applyEffect({ hunger: -10 });
    renderScene("【第三天·早】附近的物资见底了，你们冒险前往边缘的大型地下仓库。深处突然传来一声巨响和呼救声。", [
      { text: "立刻隐蔽，观察情况", action: () => {
          applyEffect({ san: -5 });
          renderScene("你躲在暗处，发现暴徒抢劫了一个女孩，女孩大腿被刺伤。暴徒走后，你们才敢出来，女孩已经不见了，只留下血迹。你们匆匆拿了些东西离开。", [{text:"走进废墟通道", action: startDay3_Mid}]);
      }},
      { text: "直接冲出去，赶走暴徒！", action: () => {
          let dmg = state.hasWeapon ? -15 : -30;
          applyEffect({ hp: dmg, hunger: 20 });
          renderScene("你和暴徒发生冲突，赶走了他们，救下了一个女孩。但这里不能久留，你背起包迅速撤离。", [{text:"走进废墟通道", action: startDay3_Mid}]);
      }},
      { text: "趁乱绕过去，先搜刮物资", action: () => {
          applyEffect({ hunger: 25, san: -15 });
          renderScene("你无视呼救，潜入深处拿到了罐头。出来时人已经不见了。你带着沉甸甸的物资和愧疚感加快脚步离开。", [{text:"走进废墟通道", action: startDay3_Mid}]);
      }}
    ]);
  }

  function startDay3_Mid() {
    applyEffect({ hunger: -10 });
    renderScene("【第三天·中】为了躲避大路，你们走了废墟通道。你因为体力不支，踩中了猎人布置的陷阱！一个浑身是伤的少女（小雅）举着木矛对准你们。", [
      { text: "举起手，尝试给她包扎伤口", action: () => {
          if (state.hasMeds) {
             if (Math.random() < 0.5) {
                applyEffect({ team: "小雅" });
                renderScene("小雅放下了武器，决定跟着你一起走。", [{text:"夜晚", action: startDay3_Night}]);
             } else {
                applyEffect({ hp: -15 });
                renderScene("她以为你要抢东西，刺伤了你然后逃跑了。", [{text:"夜晚", action: startDay3_Night}]);
             }
          } else {
             applyEffect({ san: -5 });
             renderScene("你没有医疗包，只能摊开手。她犹豫了一下，依然戒备地跑了。", [{text:"夜晚", action: startDay3_Night}]);
          }
      }},
      { text: "让老陈去交涉（需老陈在场）", action: () => {
          if (state.team.includes("老陈")) {
            applyEffect({ team: "小雅" });
            renderScene("老陈安抚了她。她说自己是野外生存好手，能帮你们防陷阱。小雅加入了队伍。", [{text:"夜晚", action: startDay3_Night}]);
          } else {
            renderScene("你大喊老陈的名字，但没人回应。小雅趁机跑了。", [{text:"夜晚", action: startDay3_Night}]);
          }
      }},
      { text: "趁机抢劫她", action: () => {
          applyEffect({ hunger: 20, san: -25 });
          renderScene("你抢走了她的水和肉，她绝望地逃走了。", [{text:"夜晚", action: startDay3_Night}]);
      }},
      { text: "无视她，绕路走开", action: () => {
          applyEffect({ san: -5 });
          renderScene("你们默默离开了。", [{text:"夜晚", action: startDay3_Night}]);
      }}
    ]);
  }

  function startDay3_Night() {
    applyEffect({ hunger: -10 });
    let text = "【第三天·晚】你们在废弃的防空洞过夜。";
    let opts = [{text:"度过今晚", action: () => endDay(3)}];
    
    if (state.flags.hasWhiteRoomFile) {
      text += "你翻看白房文件，上面写着：'A级样本已脱离控制，疑似向本区域移动'。就在这时，洞外传来凄厉的惨叫和沉重的踩踏声！";
      opts = [
        { text: "立刻用杂物堵死大门", action: () => { applyEffect({san: -10, hunger: -5}); renderScene("怪物徘徊很久才离开，你们一晚上没合眼。", [{text:"度过今晚", action: () => endDay(3)}]); }},
        { text: "让小雅去探情况（需小雅）", action: () => {
            if (state.team.includes("小雅")) {
              applyEffect({san: -15});
              renderScene("小雅回来说那是个浑身长满鳞片的怪物。", [{text:"度过今晚", action: () => endDay(3)}]);
            } else {
              applyEffect({hp: -5, san: -15});
              renderScene("你透过缝隙看了一眼，那东西一巴掌拍碎了汽车。它没发现你们。", [{text:"度过今晚", action: () => endDay(3)}]);
            }
        }}
      ];
    }
    renderScene(text, opts);
  }

  // ================= 第四天剧情 =================
  function startDay4_Early() {
    applyEffect({ hunger: -10 });
    renderScene("【第四天·早】今天出奇的安静，感染者都不见了。你们在便利店搜刮时，发现似乎有人在暗处盯着你们。", [
      { text: "提高警惕，放弃搜刮绕路", action: () => {
          applyEffect({ hp: -5, hunger: -5 });
          renderScene("你们绕了很远，白耗了体力，最终走到了一片开阔的废弃广场。", [{text:"继续", action: startDay4_Mid}]);
      }},
      { text: "不管那么多，加快速度搜刮", action: () => {
          if (Math.random() < 0.6) {
            applyEffect({ hunger: 20 });
            renderScene("你们拿到了饼干，但刚出门，就被几个人影逼向了广场。", [{text:"继续", action: startDay4_Mid}]);
          } else {
            applyEffect({ hp: -15, hunger: -15 });
            renderScene("你们被蒙面人偷袭，抢走了食物，还被赶向广场。", [{text:"继续", action: startDay4_Mid}]);
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
    renderScene("【第四天·晚】夜幕降临，无论你们怎么绕路，最终都走到了城南废弃地铁站附近。入口亮着一盏微弱的紫外线白灯，像是诱饵。", [
      { text: "鼓起勇气，走入地铁站", action: () => {
          applyEffect({ san: -15 });
          state.flags.joinWhiteRoom = true; // 标记加入白房
          renderScene("你见到了兜帽男，他指着装满绿色液体的注射器：'打下去，你就不再是凡人。'", [{text:"度过今晚", action: () => endDay(4)}]);
      }},
      { text: "远远看一眼，立刻转身逃跑", action: () => {
          applyEffect({ hunger: -15, hp: -5 });
          state.flags.joinWhiteRoom = false; // 标记拒绝白房
          renderScene("你们连夜跑到了很远的地方扎营，虽然极度疲惫，但觉得离疯子越远越好。", [{text:"度过今晚", action: () => endDay(4)}]);
      }}
    ]);
  }

  // ================= 日夜结算与跳转 =================
  function endDay(dayNumber) {
    applyEffect({ hp: 10, hunger: -10 });
    if (state.team.includes("老陈")) applyEffect({ hp: 10 });
    if (state.team.includes("小雅")) applyEffect({ san: 10 });
    if (state.hasPhoto) applyEffect({ san: 10 });
    
    if (state.infectionTimer > 0) {
      applyEffect({ hp: -10 });
      state.infectionTimer--;
    }

    if (checkDeath()) return;

    if (dayNumber === 1) {
      state.day = 2;
      startDay2_Early();
    } else if (dayNumber === 2) {
      state.day = 3;
      startDay3_Early();
    } else if (dayNumber === 3) {
      state.day = 4;
      startDay4_Early();
    } else if (dayNumber === 4) {
      state.day = 5;
      // 第五天根据今天的选择，分两条线。这里暂时给出结算界面。
      showEnd("第四天存活", "核心剧情分支已开启！<br><br>当前状态：生命 " + state.hp + "，理智 " + state.san + "，饥饿 " + state.hunger + "。<br>队伍成员：" + (state.team.join("、") || "无") + "。<br>是否选择加入白房：" + (state.flags.joinWhiteRoom ? "是" : "否") + "。<br><br>下一回合，我们将为您接入最终的【第五天到第七天】双线大结局代码！");
    }
      // ================= 第五天（双线分支） =================

  // 荒野求生线（自我觉醒）
  function startDay5_Wilderness() {
    applyEffect({ hunger: -10 });
    renderScene("【第五天·荒野】昨晚你们逃离了白房。今天下起了酸雨，你们不仅没食物，还遇到了一群发狂的感染者，被逼到了悬崖边。", [
      { text: "冒着酸雨，强行冲进前方的防空洞", action: () => {
          applyEffect({ hp: -15 });
          renderScene("你们冲进防空洞，惊动了里面的变异兽，触发战斗！", [
            { text: "迎战（拥有武器会轻松很多）", action: () => {
                if (state.hasWeapon) { applyEffect({ hunger: 30 }); renderScene("你挥舞着武器击杀了变异兽，获得了大量的兽肉。", [{text:"继续", action: startDay5_Mid_Wilderness}]); }
                else { applyEffect({ hp: -20 }); renderScene("你赤手空拳与变异兽搏斗，惨胜。获得了一些食物。", [{text:"继续", action: startDay5_Mid_Wilderness}]); }
            }},
            { text: "让老陈/小雅引开它，你趁机搜刮", action: () => {
                if (state.team.length > 0) { applyEffect({san: -10}); renderScene("同伴引开了怪物，你拿到了物资。大家都平安无事。", [{text:"继续", action: startDay5_Mid_Wilderness}]); }
                else { applyEffect({hp: -30}); renderScene("你试图自己引开它，被狠狠抓了一爪子。", [{text:"继续", action: startDay5_Mid_Wilderness}]); }
            }}
          ]);
      }},
      { text: "寻找其他避雨点，稳妥为主", action: () => { applyEffect({ hunger: -10, hp: -5, san: -5 }); renderScene("你们只找到一个漏雨的破帐篷，挤在一起瑟瑟发抖。", [{text:"继续", action: startDay5_Mid_Wilderness}]); }}
    ]);
  }

  function startDay5_Mid_Wilderness() {
    applyEffect({ hunger: -10 });
    renderScene("【第五天·中】中午，你们遇到了一群将你们逼到悬崖边的发狂感染者。退无可退！", [
      { text: "挡在同伴面前，准备用肉体硬抗", action: () => {
          if (state.hasWeapon || state.san > 50) {
            applyEffect({ san: -20 });
            state.flags.hiddenPower = "肉体强化/治愈";
            renderScene("绝境中，你的大脑一阵刺痛，一股无形的力量爆发。你觉醒了属于你自己的超能力，瞬间撕裂了感染者！", [{text:"夜晚", action: startDay5_Night_Wilderness}]);
          } else {
            applyEffect({ hp: -35 });
            renderScene("你被咬得遍体鳞伤，侥幸被同伴救下。", [{text:"夜晚", action: startDay5_Night_Wilderness}]);
          }
      }},
      { text: "拉着同伴跳下悬崖（下方是河流）", action: () => { applyEffect({ hp: -15, hunger: -20 }); renderScene("你们落入水中，侥幸活命，但丢失了大量物资。", [{text:"夜晚", action: startDay5_Night_Wilderness}]); }}
    ]);
  }

  function startDay5_Night_Wilderness() {
    applyEffect({ hunger: -10 });
    let text = "【第五天·晚】你们在山洞里生起了火。虽然什么都没有，但活下来了。";
    if (state.team.includes("老陈")) text += "老陈默默拿出白天省下的半块饼干递给你。";
    if (state.team.includes("小雅")) text += "小雅用干草给你铺了一个舒服的床铺。";
    
    renderScene(text, [
      { text: "和同伴分享心情，互相依靠", action: () => { if(state.team.length>0) applyEffect({ san: 20 }); renderScene("你们相视一笑，这世道还有人陪着真好。", [{text:"度过今晚", action: () => endDay(5)}]); }},
      { text: "独自冥想，感受体内的异样", action: () => { applyEffect({ san: 10 }); renderScene("你开始尝试控制今天觉醒的微弱力量。", [{text:"度过今晚", action: () => endDay(5)}]); }}
    ]);
  }

  // 白房绝命线
  function startDay5_WhiteRoom() {
    applyEffect({ hunger: -10 });
    renderScene("【第五天·白房】你走进了地铁站。兜帽男将你绑在手术台上，给你注射了绝命转化药剂。你开始剧烈抽搐！", [
      { text: "咬紧牙关，接受注射", action: () => {
          applyEffect({ hp: -30, san: -15 });
          if (state.hasMeds) { applyEffect({ hp: 10 }); renderScene("你随身携带的抗生素稍微减缓了你的痛苦。", [{text:"继续", action: startDay5_Mid_WhiteRoom}]); }
          else { renderScene("你痛得几乎要咬碎牙齿。", [{text:"继续", action: startDay5_Mid_WhiteRoom}]); }
      }},
      { text: "拼命挣扎，试图逃跑", action: () => { applyEffect({ hp: -40 }); state.flags.hasCollar = true; renderScene("你被高压电击棍击晕，强行注射，并被戴上了限制项圈。", [{text:"继续", action: startDay5_Mid_WhiteRoom}]); }}
    ]);
  }

  function startDay5_Mid_WhiteRoom() {
    applyEffect({ hunger: -10 });
    let text = "【第五天·中】药剂在你体内翻江倒海，你快要死了。兜帽男冷冷地说：'浓度不够，需要催化剂。'";
    let opts = [];
    
    if (state.team.length > 0) {
      text += "他指着你的同伴：'把他们的脑垂体交出来，你就能活，还能获得力量。'";
      opts = [
        { text: "交出同伴，换取力量（极度邪恶）", action: () => { applyEffect({ san: -50 }); state.team = []; state.flags.hiddenPower = "深渊之力"; renderScene("同伴被拖走。你喝下提取液，痛苦消失，但你永远失去了灵魂。", [{text:"夜晚", action: startDay5_Night_WhiteRoom}]); }},
        { text: "宁死不从，试图救走同伴", action: () => { applyEffect({ hp: -40, san: -30 }); state.team = []; renderScene("你们被毒打。同伴为了掩护你，撞向了枪口牺牲。你重伤逃出实验室。", [{text:"夜晚", action: startDay5_Night_WhiteRoom}]); }}
      ];
    } else {
      text += "因为你没有同伴，他把你踹出实验室：'去外面抓个无辜的人回来。'";
      opts = [
        { text: "抓一个幸存者回来", action: () => { applyEffect({ san: -30 }); state.flags.hiddenPower = "深渊之力"; renderScene("你杀了一个无辜者，你活了下来，觉醒了强大的异能。", [{text:"夜晚", action: startDay5_Night_WhiteRoom}]); }},
        { text: "放走幸存者，自己承受反噬", action: () => { applyEffect({ hp: -40, san: 10 }); renderScene("你放走了人，白房没杀你，但你的身体因缺乏催化剂而濒临崩溃。", [{text:"夜晚", action: startDay5_Night_WhiteRoom}]); }}
      ];
    }
    renderScene(text, opts);
  }

  function startDay5_Night_WhiteRoom() {
    applyEffect({ hunger: -10 });
    renderScene("【第五天·晚】夜晚，你躺在白房提供的干净床铺上。这里有充足的食物，但你的心像死了一样寂静。", [
      { text: "吃下白房提供的丰盛晚餐", action: () => { state.hunger = 100; applyEffect({ san: -10 }); renderScene("每一口都像在吃人血馒头。", [{text:"度过今晚", action: () => endDay(5)}]); }},
      { text: "在深夜里研究白房文件，寻找弱点", action: () => { applyEffect({ san: 10 }); renderScene("你暗中立誓，如果获得力量，一定要把白房连根拔起。", [{text:"度过今晚", action: () => endDay(5)}]); }}
    ]);
  }

  // ================= 第六天 =================

  // 荒野线：破茧反杀
  function startDay6_Wilderness() {
    applyEffect({ hunger: -10 });
    renderScene("【第六天·荒野】白房的外围人员追杀你们。经过昨天的觉醒，你们不再束手就擒。", [
      { text: "利用觉醒能力/战术正面反击", action: () => { applyEffect({ san: -10, hunger: 20 }); renderScene("你们反杀了追兵，抢夺了他们的高级装备和口粮。", [{text:"夜晚", action: startDay6_Night_Wilderness}]); }},
      { text: "利用废墟地形布置陷阱", action: () => { if(state.team.includes("小雅")){ applyEffect({hunger: 15}); renderScene("小雅布置了陷阱，你们完美伏击了追兵。", [{text:"夜晚", action: startDay6_Night_Wilderness}]); } else { applyEffect({hp: -15}); renderScene("陷阱不够完美，你受了点伤才解决他们。", [{text:"夜晚", action: startDay6_Night_Wilderness}]); } }}
    ]);
  }

  function startDay6_Night_Wilderness() {
    applyEffect({ hunger: -10 });
    renderScene("【第六天·晚】你们找到了白房在城市边缘的废弃观测站外围。明天就是最终决战。", [
      { text: "好好休息，养精蓄锐", action: () => endDay(6) }
    ]);
  }

  // 白房线：异变与反噬
  function startDay6_WhiteRoom() {
    applyEffect({ hunger: -10 });
    renderScene("【第六天·白房】你的异能副作用爆发，脑海中响起伊芙博士的声音。她命令你去清理城南的暴徒。", [
      { text: "服从命令，去清理暴徒", action: () => { applyEffect({ san: -20, hunger: 20 }); renderScene("你大开杀戒，获得了博士的信任和大量补给。", [{text:"夜晚", action: startDay6_Night_WhiteRoom}]); }},
      { text: "抗拒命令，承受项圈电击", action: () => { applyEffect({ hp: -30, san: 10 }); renderScene("你被电得皮开肉绽，但放走了几个无辜者。", [{text:"夜晚", action: startDay6_Night_WhiteRoom}]); }}
    ]);
  }

  function startDay6_Night_WhiteRoom() {
    applyEffect({ hunger: -10 });
    renderScene("【第六天·晚】白房的广播彻夜响着。明天，你就要去核心实验室见伊芙博士了。", [
      { text: "带着决绝的心入睡", action: () => endDay(6) }
    ]);
  }

  // ================= 第七天（大结局） =================

  // 荒野线结局
  function startDay7_Wilderness() {
    applyEffect({ hunger: -10 });
    renderScene("【第七天·决战】你们潜入观测站。屏幕上出现伊芙博士的录像：“感谢你帮我完成了边缘测试。”", [
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

  // 白房线结局
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

  // ================= 日夜结算跳转逻辑（替换掉旧的） =================
  function endDay(dayNumber) {
    applyEffect({ hp: 10, hunger: -10 });
    if (state.team.includes("老陈")) applyEffect({ hp: 10 });
    if (state.team.includes("小雅")) applyEffect({ san: 10 });
    if (state.hasPhoto) applyEffect({ san: 10 });
    
    if (state.infectionTimer > 0) {
      applyEffect({ hp: -10 });
      state.infectionTimer--;
    }

    if (checkDeath()) return;

    if (dayNumber === 1) { state.day = 2; startDay2_Early(); }
    else if (dayNumber === 2) { state.day = 3; startDay3_Early(); }
    else if (dayNumber === 3) { state.day = 4; startDay4_Early(); }
    else if (dayNumber === 4) { 
      state.day = 5; 
      // 👇 这里自动根据你第四天的选择，进入两条不同路线 👇
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
