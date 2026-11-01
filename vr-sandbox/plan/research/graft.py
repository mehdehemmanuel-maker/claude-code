"""Graft a round's research files into the book of questions and the tree, then recompile the index.

Usage: python3 plan/research/graft.py ROUND FIRST_CHAPTER file1 "title 1" file2 "title 2" ...
Each file's (C) questions become a section of BOOK-OF-QUESTIONS.md, to be cut to the best (the rubric of decision 0010) (the file then points to it); its (D) branches are
added to TREE.md as open; a row is added to the tree's rounds table. The brief each pass is given is BRIEF.md here.
"""
import sys,re,os,datetime,subprocess
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
TODAY=datetime.date.today().isoformat()
rnd=sys.argv[1]; ch=int(sys.argv[2]); args=sys.argv[3:]
pairs=list(zip(args[0::2],args[1::2]))
book=open('BOOK-OF-QUESTIONS.md').read().rstrip()+"\n"
tree=open('research/TREE.md').read()
g=f"\n## Branches grafted in round {rnd} (open)\n"
tq=0; tb=0; names=[]
for f,title in pairs:
    p='research/'+f
    if not os.path.exists(p): print("MISSING",f); continue
    s=open(p).read()
    i=s.index("## (C) Questions"); j=s.index("## (D) New branches")
    body=s[i+len("## (C) Questions"):j]
    keep=[l for l in body.splitlines() if re.match(r"^\s*\d+\.\s",l) or l.startswith("### ")]
    n=0; out=[]
    for l in keep:
        if l.startswith("### "): out.append("\n"+l)
        else: n+=1; out.append(f"{n}. "+re.sub(r"^\s*\d+\.\s*","",l))
    book+=f"\n---\n\n## Chapter {ch}. {title}\n\n*From `research/{f}` (round {rnd}).*\n\n"+"\n".join(out).strip()+"\n"
    s=s[:i]+f"## (C) Questions\n\nThe {n} questions of this pass are chapter {ch} of `../BOOK-OF-QUESTIONS.md`.\n\n"+s[j:]
    open(p,'w').write(s)
    br=[l[2:].strip() for l in s[s.index("## (D) New branches"):].splitlines() if l.startswith("- ")]
    g+=f"\n### From {title} (`{f}`)\n"+"\n".join(f"- [ ] {b}" for b in br)+"\n"
    tq+=n; tb+=len(br); names.append(title); ch+=1
tree=tree.replace("\n## Rounds",g+"\n## Rounds")
tree=tree.rstrip()+f"\n| {rnd} | {TODAY} | {', '.join(f for f,_ in pairs)} | {'; '.join(names)} | {tb} |\n"
open('research/TREE.md','w').write(tree); open('BOOK-OF-QUESTIONS.md','w').write(book)
print("questions",tq,"branches",tb,"chapters to",ch-1)
subprocess.run([sys.executable, 'compile.py'])
