import TestHelpers from '../../tests-helpers';
import models from '../../../src/models';
import request from 'supertest';
import JWTUtils from '../../../src/utils/jwt-utils';

describe('Token', () => {
  let app;
  let newUserResponse;

  beforeAll(async () => {
    await TestHelpers.startDb();
    app = TestHelpers.getApp();
  });

  afterAll(async () => {
    await TestHelpers.stopDb();
  });

  beforeEach(async () => {
    await TestHelpers.syncDb();
    newUserResponse = await TestHelpers.registerNewUser({
      email: 'test@example.com',
      password: 'test123',
    });
  });

  describe('requiresAuth middleware', () => {
    it('should fail if the refresh token is invalid', async () => {
      const response = await request(app)
        .post('/v1/token')
        .set('Authorization', 'Bearer invalidToken')
        .send()
        .expect(401);
      expect(response.body.success).toEqual(false);
      expect(response.body.message).toEqual('Invalid token');
    });

    it('should fail if no authorization header is present', async () => {
      const response = await request(app).post('/v1/token').send().expect(401);
      expect(response.body.success).toEqual(false);
      expect(response.body.message).toEqual('Authorization header not found');
    });

    it('should fail if the authorization header is malformed', async () => {
      const response = await request(app)
        .post('/v1/token')
        .set('Authorization', 'invalid')
        .send()
        .expect(401);
      expect(response.body.success).toEqual(false);
      expect(response.body.message).toEqual('Bearer token malformed');
    });
  });

  describe('errors middleware', () => {
    it('should return 500 if something went wrong', async () => {
      const jwtUtilsSpy = jest.spyOn(JWTUtils, 'generateAccessToken');
      jwtUtilsSpy.mockImplementation(() => {
        throw Error('test error');
      });
      const refreshToken = newUserResponse.body.data.refreshToken;
      const response = await request(app)
        .post('/v1/token')
        .set('Authorization', `Bearer ${refreshToken}`)
        .send()
        .expect(500);

      jwtUtilsSpy.mockRestore();
      expect(response.body.success).toEqual(false);
      expect(response.body.message).toEqual('test error');
    });
  });
});
