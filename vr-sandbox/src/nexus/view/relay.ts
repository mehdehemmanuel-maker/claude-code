// What you report goes to Claude Code, the session that writes Nexus's laws and the forge's code. In a claude.ai
// artifact it goes as a comment sent to Claude (the `comments` capability), which wakes that session; the note is also
// kept in the artifact's store. Where the page cannot send one (a copy on GitHub Pages, a viewer who is not an editor,
// no session watching), it says why, and keeps the note for the one way that still reaches Claude from here: an issue
// on the repository, filled in, for you to file with one press.

export const REPO = 'mehdehemmanuel-maker/claude-code';

interface Anchor { path: string; x: number; y: number }
interface CommentsLike {
  canSendToClaude(): Promise<string>;
  anchorFor(el: Element): Promise<Anchor>;
  sendToClaude(t: { anchor: Anchor; text: string }): Promise<{ threadId: string }>;
}
export interface Sent { ok: boolean; said: string }
export interface Relay {
  /** Where notes go from this page: to Claude directly, or kept for an issue. */
  readonly route: 'claude' | 'issue';
  send(text: string, at: Element): Promise<Sent>;
  /** A filled-in issue for notes that could not be sent: the link to open on a press. */
  issueUrl(texts: string[]): string;
}

const WHY: Record<string, string> = {
  writers_only: 'you can comment here but are not an editor of this artifact',
  no_session: 'no Claude Code session is watching this artifact right now',
  off: 'sending to Claude is off in this view',
  consent_required: 'the page has not been allowed to comment as you yet (allow it once on the flat page)',
  forbidden: 'commenting from the page is off here',
  claude_unavailable: 'no Claude session could take it from this view',
  rate_limited: 'too many sent at once; it is kept',
};

export async function makeRelay(): Promise<Relay> {
  const claude = (window as unknown as { claude?: { use(n: string): Promise<unknown> } }).claude;
  const comments = claude ? ((await claude.use('comments').catch(() => null)) as CommentsLike | null) : null;
  const issueUrl = (texts: string[]) => {
    const body = `${texts.map((t, i) => `${i + 1}. ${t}`).join('\n\n')}\n\n(from the Nexus forge)`;
    return `https://github.com/${REPO}/issues/new?${new URLSearchParams({ title: texts.length === 1 ? `Forge: ${texts[0]!.slice(0, 80)}` : `Forge: ${texts.length} notes`, body: body.slice(0, 6000), labels: 'forge-note' })}`;
  };
  return {
    route: comments ? 'claude' : 'issue',
    issueUrl,
    async send(text, at) {
      if (!comments) return { ok: false, said: 'This page cannot reach Claude Code directly; it is kept, and ⇪ Send files it to the repository for Claude.' };
      const can = await comments.canSendToClaude().catch(() => 'off');
      if (can !== 'available') return { ok: false, said: `Not sent to Claude Code: ${WHY[can] ?? can}. It is kept with the machine.` };
      try {
        await comments.sendToClaude({ anchor: await comments.anchorFor(at), text: text.slice(0, 3900) });
        return { ok: true, said: 'Sent to Claude Code, who writes the laws: it comes back in a build.' };
      } catch (e) {
        const code = (e as { code?: string }).code ?? 'upstream_error';
        return { ok: false, said: `Not sent to Claude Code: ${WHY[code] ?? code}. It is kept with the machine.` };
      }
    },
  };
}
