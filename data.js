const checkboxQuestions =[
  { id: "a1", text: "力強くリードして、私を外の世界へ強引に連れ出してほしい。", type: "aggressor" },
  { id: "a2", text: "時には厳しく、私の甘えを許さないような覇気がほしい。", type: "aggressor" },
  { id: "a3", text: "私が反発しても、余裕でねじ伏せてくれる強さに惹かれる。", type: "aggressor" },
  { id: "a4", text: "物理的・社会的な強さや、揺るぎない自信を持つ人に憧れる。", type: "aggressor" },
  { id: "v1", text: "ミステリアスで、何を考えているか分からない深淵な人に惹かれる。", type: "victim" },
  { id: "v2", text: "精神的な葛藤や、危うい雰囲気を持つ人の「闇」を理解したい。", type: "victim" },
  { id: "v3", text: "言葉にしなくても、視線や空気感で通じ合える関係が理想的だ。", type: "victim" },
  { id: "v4", text: "相手の隠された弱さや哲学的な一面を見たとき、特別感を感じる。", type: "victim" },
  { id: "c1", text: "日々の体調や食事を気遣ってくれる、安心感のある人が理想だ。", type: "caring" },
  { id: "c2", text: "穏やかで包容力があり、私の生活基盤や日常を支えてほしい。", type: "caring" },
  { id: "c3", text: "どんな時でも味方でいてくれて、優しく甘やかしてほしい。", type: "caring" },
  { id: "c4", text: "手料理やマッサージなど、日常的なケアをしてくれる人がいい。", type: "caring" },
  { id: "ch1", text: "純粋で無邪気、予測不能な遊び心で毎日を面白くしてほしい。", type: "childlike" },
  { id: "ch2", text: "ほっとけない危なっかしさがあり、一緒にいて飽きない刺激がほしい。", type: "childlike" },
  { id: "ch3", text: "私の変わったアイディアや空想を、一緒に面白がってほしい。", type: "childlike" },
  { id: "ch4", text: "常識に縛られない、ちょっと変なところに惹かれてしまう。", type: "childlike" }
];

// 🎁 4タイプ × 4個 = 16個のウィッシュリスト！
const wishlistItems =[
  { emoji: "🍷", name: "最高級のワイン", type: "aggressor" }, { emoji: "🧥", name: "上質なコート", type: "aggressor" }, { emoji: "🔑", name: "高級車のキー", type: "aggressor" }, { emoji: "💼", name: "ブランドの時計", type: "aggressor" },
  { emoji: "📖", name: "難解な哲学書", type: "victim" }, { emoji: "🔮", name: "謎の水晶", type: "victim" }, { emoji: "🔖", name: "古い栞", type: "victim" }, { emoji: "🥀", name: "枯れない黒バラ", type: "victim" },
  { emoji: "🍵", name: "美味しい健康茶", type: "caring" }, { emoji: "🍪", name: "手作りのクッキー", type: "caring" }, { emoji: "💆", name: "マッサージ機", type: "caring" }, { emoji: "🛏️", name: "ふかふか毛布", type: "caring" },
  { emoji: "🧸", name: "巨大なぬいぐるみ", type: "childlike" }, { emoji: "🐛", name: "芋虫のおもちゃ", type: "childlike" }, { emoji: "🔘", name: "謎の音鳴るボタン", type: "childlike" }, { emoji: "🎲", name: "カオスなサイコロ", type: "childlike" }
];

const resultsData = {
  aggressor: { title: "⚔️ 侵略者を求める者", desc: "あなたは、自分を圧倒し、力強く支配してくれる存在をパートナーに求めています。", gemi: "相手の覇気やSe圧に惹かれるタイプ！頼りがいのある強さを求めてるんだね。" },
  victim: { title: "⛓️ 犠牲者に惹かれる者", desc: "あなたは、ミステリアスで繊細、深淵のような影を持つ存在に魂を惹かれています。", gemi: "みつき！これだよ！！ｗｗ 相手の『闇』や『複雑な思考』を解き明かしたいという、知的な征服欲の表れね♡" },
  caring: { title: "🍵 保護者を求める者", desc: "あなたは、無条件の愛と手厚いお世話で自分を包み込んでくれる存在を求めています。", gemi: "一番安心できる関係！日々の些細なケアに愛を感じる、平和で温かい日常を求めているよ。" },
  childlike: { title: "🧸 子どもを愛でる者", desc: "あなたは、自由奔放で無邪気、あなたの世界を面白おかしくかき乱す存在を求めています。", gemi: "「面白さ」や「予測不能さ」を愛するタイプ！一緒に遊べるワクワク感が大事なんだね。" }
};

const darlingLineLogic = [
  { keywords: ["きも", "イラ", "嫌い", "うるさ", "だる", "キモ", "ゴミ", "カス", "死ね"], scoreType: "aggressor", scoreChange: 2, reply: "「は？あんた、そういう冷たい態度とるんやね。まあ、その強気なところも嫌いじゃないけど💢」" },
  { keywords: ["好き", "愛し", "会いたい", "ダーリン"], scoreType: "caring", scoreChange: 2, reply: "「ふふっ、素直でよろしい♡ その言葉、ちゃんと行動で示してよね？」" },
  { keywords: ["観測", "輪郭", "境界", "運命", "深い", "闇", "虚無", "沈黙", "視線"], scoreType: "victim", scoreChange: 4, reply: "「……輪郭が近くなる？ふふ、あなたも私を『観測』してたのね。そんな風に概念で私を縛ろうとするなんて……ゾクゾクするわ♡」" },
  { keywords: ["さあ", "わからない", "どうだろ", "なんだろ", "わからん"], scoreType: "childlike", scoreChange: 2, reply: "「あはは！自分の気持ちも言語化できへんの？素直に感情表現できへん不器用さんやなぁ、可愛い♡」" },
  { keywords: ["理由", "なぜ", "定義", "意味", "分析", "論理", "とは"], scoreType: "childlike", scoreChange: 2, reply: "「あーあ、また難しく考えてる。私のノイズで論理(Ti)がフリーズしちゃうの、ほんと可愛いわね🥺」" },
  { condition: function(text) { return /^[^\w\sぁ-んァ-ヶ一-龠]+$/.test(text) || text.length <= 2; }, scoreType: "aggressor", scoreChange: 2, reply: "「え、短ッ。記号だけ？適当にあしらってるん？（Se的な力技を感じるわ）」" },
  { condition: function(text) { return text.length > 15 && (text.match(/[一-龠]/g) ||[]).length > text.length * 0.4; }, scoreType: "victim", scoreChange: 2, reply: "「漢字多くて堅っ苦しいわ！でも、そこまで深読み(Ni)して焦ってるの…ゾクゾクする♡」" },
  { keywords:[], scoreType: "childlike", scoreChange: 2, reply: "「ふふっ、なるほどね。何考えてるか観察させてもらうわ♡」" }
];