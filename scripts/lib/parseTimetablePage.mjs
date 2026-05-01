import { parseCircularLoop } from './parseFamilies/parseCircularLoop.mjs';
import { parseLinearIntercity } from './parseFamilies/parseLinearIntercity.mjs';
import { parseSchoolLimited } from './parseFamilies/parseSchoolLimited.mjs';
import { parseUrbanBranched } from './parseFamilies/parseUrbanBranched.mjs';

const FAMILY_PARSERS = {
  'linear-intercity': parseLinearIntercity,
  'urban-branched': parseUrbanBranched,
  'circular-or-loop': parseCircularLoop,
  'school-or-limited-service': parseSchoolLimited,
};

export function parseTimetablePage(config) {
  const parser = FAMILY_PARSERS[config.parserFamily ?? 'linear-intercity'];

  if (!parser) {
    throw new Error(`Unsupported parser family: ${config.parserFamily}`);
  }

  return parser(config);
}
