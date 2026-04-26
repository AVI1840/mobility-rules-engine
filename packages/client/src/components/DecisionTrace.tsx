import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { EvaluationResponse } from '@/types';

interface Props {
  result: EvaluationResponse | null;
}

const resultColor = (r: string) => {
  if (r === 'pass' || r === 'true' || r === 'eligible') return 'bg-green-100 text-green-800';
  if (r === 'fail' || r === 'false' || r === 'not_eligible') return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-700';
};

export function DecisionTrace({ result }: Props) {
  if (!result?.data) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-gray-400">
          בצע הערכת זכאות כדי לראות את מסלול ההחלטה
        </CardContent>
      </Card>
    );
  }

  const { applied_rules, conflicts_resolved, discretionary_flags } = result.data;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Applied rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">שרשרת כללים שהופעלו</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {applied_rules.length === 0 && (
            <p className="text-sm text-gray-400">לא הופעלו כללים</p>
          )}
          {applied_rules.map((rule, i) => (
            <div key={rule.rule_id} className="flex gap-4 items-start border border-gray-100 rounded-lg p-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#1B3A5C] text-white text-xs flex items-center justify-center font-bold">
                {i + 1}
              </span>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-mono font-medium">{rule.rule_id}</span>
                  {rule.rule_version && (
                    <span className="text-xs text-gray-400">v{rule.rule_version}</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${resultColor(rule.evaluation_result)}`}>
                    {rule.evaluation_result}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {rule.legal_citation.document_name} · סעיף {rule.legal_citation.section} · פסקה {rule.legal_citation.paragraph}
                  {rule.legal_citation.clause && ` · סעיף קטן ${rule.legal_citation.clause}`}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Conflicts */}
      {conflicts_resolved.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">קונפליקטים שנפתרו</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {conflicts_resolved.map((c, i) => (
              <div key={i} className="border border-orange-100 bg-orange-50 rounded-lg p-3 text-sm space-y-1">
                <p><span className="font-medium">כללים מתנגשים: </span>{c.conflicting_rule_ids.join(', ')}</p>
                <p><span className="font-medium">כלל מנצח: </span>{c.winning_rule_id}</p>
                <p><span className="font-medium">שיטת פתרון: </span>{c.resolution_method}</p>
                <p className="text-xs text-gray-500">{c.legal_basis}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Discretionary flags */}
      {discretionary_flags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">דגלי שיקול דעת</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {discretionary_flags.map((f, i) => (
              <div key={i} className="border border-yellow-200 bg-yellow-50 rounded-lg p-3 text-sm space-y-1">
                <p><span className="font-medium">קטגוריה: </span>{f.flag_category}</p>
                <p>{f.reason}</p>
                <p className="text-xs text-gray-500">כלל: {f.applicable_rule_id}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
