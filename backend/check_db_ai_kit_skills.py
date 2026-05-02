from src.tools.db_ai_kit import _installed_skill_entries, list_db_ai_kit_skills
entries = _installed_skill_entries()
print('installed entries:', len(entries))
print('---')
data = list_db_ai_kit_skills()
print('skills count', data.get('count'))
print('installedCount', data.get('installedCount'))
print('first 5 skill names', [s['name'] for s in data.get('skills', [])[:5]])
