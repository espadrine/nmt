// Automatic Generation of Random Names.

var vowels = ['a', 'e', 'i', 'o', 'u', 'y'];
// Most common letters, digraphs, trigraphs and doubles.
var graphs = ["e","t","a","o","i","n","s","r","th","he","an","in","er","on","re","ed","nd","ha","at","en","es","of","nt","ea","ti","to","io","le","is","ou","ar","as","de","rt","ve","the","and","tha","ent","ion","tio","for","nde","has","nce","tis","oft","men","ss","ee","tt","ll","mm","oo"];
var startWithVowel = graphs.filter(function(e) {
  if (vowels.indexOf(e[0]) >= 0) return e; });
var startWithConsonant = graphs.filter(function(e) {
  if (vowels.indexOf(e[0]) < 0) return e; });


function pick(l) {
  return l[(Math.random() * l.length)|0];
}

function genName() {
  var len = (Math.random() * 4)|0 + 2;
  var name = '';
  var vowel = true;
  for (var i = 0; i < len; i++) {
    var picked = vowel? pick(startWithVowel): pick(startWithConsonant);
    name += picked;
    vowel = vowels.indexOf(picked[picked.length-1]) < 0;
  }
  if (Math.random() > 0.5) { name = name.slice(1); }
  name = String.fromCharCode(name.charCodeAt(0) - 32)
       + name.slice(1);
  return name;
}

module.exports = genName;
