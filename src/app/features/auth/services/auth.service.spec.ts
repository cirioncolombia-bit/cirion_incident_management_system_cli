import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';

const token = (expiration: number) =>
  `header.${btoa(JSON.stringify({ exp: expiration }))}.signature`;

describe('AuthService session expiration', () => {
  const navigate = vi.fn().mockResolvedValue(true);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-09T12:00:00Z'));
    sessionStorage.clear();
    localStorage.clear();
    navigate.mockClear();
    TestBed.configureTestingModule({
      providers: [
        { provide: HttpClient, useValue: {} },
        { provide: Router, useValue: { navigate } },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('expires an idle session and replaces the route with login', () => {
    const auth = TestBed.inject(AuthService);
    auth.saveSession(token(Date.now() / 1000 + 60), true);
    expect(auth.isSessionValid()).toBe(true);
    vi.advanceTimersByTime(60_000);
    expect(auth.getAccessToken()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
  });

  it('rejects an expired stored session when the application opens', () => {
    sessionStorage.setItem('cims.accessToken', token(Date.now() / 1000 - 1));
    const auth = TestBed.inject(AuthService);
    expect(auth.isSessionValid()).toBe(false);
    expect(auth.getAccessToken()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
  });

  it('rechecks expiration when a suspended tab becomes visible', () => {
    const auth = TestBed.inject(AuthService);
    auth.saveSession(token(Date.now() / 1000 + 60), false);
    vi.setSystemTime(new Date(Date.now() + 120_000));
    document.dispatchEvent(new Event('visibilitychange'));
    expect(auth.getAccessToken()).toBeNull();
    expect(navigate).toHaveBeenCalledOnce();
  });

  it('cancels the old expiration when a new session is saved', () => {
    const auth = TestBed.inject(AuthService);
    auth.saveSession(token(Date.now() / 1000 + 10), false);
    auth.saveSession(token(Date.now() / 1000 + 120), true);
    vi.advanceTimersByTime(10_000);
    expect(auth.isSessionValid()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });
});
