import registerFixture from '../../../../../contracts/fixtures/auth.register.json';
import loginFixture from '../../../../../contracts/fixtures/auth.login.json';
import refreshFixture from '../../../../../contracts/fixtures/auth.refresh.json';
import meFixture from '../../../../../contracts/fixtures/auth.me.json';
import validationErrorFixture from '../../../../../contracts/fixtures/error.validation.json';
import unauthorizedErrorFixture from '../../../../../contracts/fixtures/error.unauthorized.json';
import {
  registerResponseSchema,
  sessionResponseSchema,
  meResponseSchema,
  errorEnvelopeSchema,
} from '../authSchemas';

// Đối chiếu schema Zod phía mobile với fixture dùng chung ở contracts/fixtures/.
// Backend có test tương ứng trong backend/test/contracts.test.js đối chiếu
// CÙNG các file này -- lệch fixture sẽ đỏ test ở CẢ HAI phía cùng lúc.
describe('contracts fixtures parse duoc bang schema mobile', () => {
  it('auth.register.json khop registerResponseSchema', () => {
    expect(registerResponseSchema.parse(registerFixture.data)).toBeTruthy();
  });

  it('auth.login.json khop sessionResponseSchema', () => {
    expect(sessionResponseSchema.parse(loginFixture.data)).toBeTruthy();
  });

  it('auth.refresh.json khop sessionResponseSchema', () => {
    expect(sessionResponseSchema.parse(refreshFixture.data)).toBeTruthy();
  });

  it('auth.me.json khop meResponseSchema', () => {
    expect(meResponseSchema.parse(meFixture.data)).toBeTruthy();
  });

  it('error.validation.json khop errorEnvelopeSchema', () => {
    expect(errorEnvelopeSchema.parse(validationErrorFixture.error)).toBeTruthy();
  });

  it('error.unauthorized.json khop errorEnvelopeSchema', () => {
    expect(errorEnvelopeSchema.parse(unauthorizedErrorFixture.error)).toBeTruthy();
  });
});
