import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { EvaluationResponse } from '@/types';

interface Props {
  result: EvaluationResponse | null;
}

export function RuleExplanation({ result }: Props) {
  if (!result?.data) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-gray-400">
          בצע הערכת זכאות כדי לראות את הסבר הכללים
        </CardContent>
      </Card>
    );
  }

  const { explanation_narrative, applied_rules, discretionary_flags } = result.data;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Narrative */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">הסבר ההחלטה</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">{explanation_narrative}</p>
        </CardContent>
      </Card>

      {/* Applied rules detail */}
      {applied_rules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">כללים שהופעלו</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {applied_rules.map(rule => (
              <div key={rule.rule_id} className="border border-gray-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-semibold text-[#1B3A5C]">{rule.rule_id}</span>
                  {rule.rule_version && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">v{rule.rule_version}</span>
                  )}
                </div>
                <div className="text-xs text-gray-600 space-y-0.5">
                  <p><span className="font-medium">מסמך: </span>{rule.legal_citation.document_name}</p>
                  <p><span className="font-medium">סעיף: </span>{rule.legal_citation.section}</p>
                  <p><span className="font-medium">פסקה: </span>{rule.legal_citation.paragraph}</p>
                  {rule.legal_citation.clause && (
                    <p><span className="font-medium">סעיף קטן: </span>{rule.legal_citation.clause}</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Discretionary flags */}
      {discretionary_flags.length > 0 && (
        <Card className="border-yellow-300">
          <CardHeader>
            <CardTitle className="text-base text-yellow-800">⚠️ דגלי שיקול דעת</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {discretionary_flags.map((f, i) => (
              <div key={i} className="bg-yellow-50 rounded-lg p-3 text-sm">
                <p className="font-medium text-yellow-900">{f.flag_category}</p>
                <p className="text-yellow-800 mt-1">{f.reason}</p>
                <p className="text-xs text-yellow-600 mt-1">כלל: {f.applicable_rule_id}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
