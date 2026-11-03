import fs from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'

import { runGenerator, runGeneratorError } from '../testing/index.js'
import { mkdir, readdir, readFile, unlink, writeFile } from './index.js'

const TEST_DIR = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'schema-truth-file-')), 'tmp')

describe('file', () => {
  afterEach(async () => {
    if (fs.existsSync(TEST_DIR)) {
      await fsp.rm(TEST_DIR, { recursive: true })
    }
  })

  describe('mkdir', () => {
    it('creates a directory', async () => {
      await expect(runGenerator(mkdir(TEST_DIR))).resolves.toBeUndefined()
      expect(fs.existsSync(TEST_DIR)).toBe(true)
    })

    it('accepts a directory that already exists', async () => {
      await fsp.mkdir(TEST_DIR, { recursive: true })
      await expect(runGenerator(mkdir(TEST_DIR))).resolves.toBeUndefined()
    })

    it('creates nested directories', async () => {
      const deepPath = path.join(TEST_DIR, 'a', 'b', 'c')
      await expect(runGenerator(mkdir(deepPath))).resolves.toBeUndefined()
      expect(fs.existsSync(deepPath)).toBe(true)
    })

    it('fails when a file blocks the path', async () => {
      const filePath = path.join(TEST_DIR, 'foo.txt')
      await fsp.mkdir(TEST_DIR, { recursive: true })
      await fsp.writeFile(filePath, 'dummy')
      const result = await runGeneratorError(mkdir(path.join(filePath, 'bar')))
      expect(result.message.length).toBeGreaterThan(0)
    })
  })

  describe('readdir', () => {
    beforeEach(async () => {
      await fsp.mkdir(TEST_DIR, { recursive: true })
      await fsp.writeFile(path.join(TEST_DIR, 'a.txt'), 'A')
      await fsp.writeFile(path.join(TEST_DIR, 'b.txt'), 'B')
    })

    it('lists files', async () => {
      const result = await runGenerator(readdir(TEST_DIR))
      expect([...result].sort()).toStrictEqual(['a.txt', 'b.txt'])
    })

    it('reads a missing directory as empty', async () => {
      expect(await runGenerator(readdir(path.join(TEST_DIR, 'missing')))).toStrictEqual([])
    })

    it('lists an empty directory as empty', async () => {
      const emptyDir = path.join(TEST_DIR, 'empty')
      await fsp.mkdir(emptyDir, { recursive: true })
      expect(await runGenerator(readdir(emptyDir))).toStrictEqual([])
    })
  })

  describe('readFile', () => {
    beforeEach(async () => {
      await fsp.mkdir(TEST_DIR, { recursive: true })
    })

    it('returns the contents of an existing file', async () => {
      const filePath = path.join(TEST_DIR, 'read.txt')
      await fsp.writeFile(filePath, 'hello world')
      expect(await runGenerator(readFile(filePath))).toBe('hello world')
    })

    it('returns null when the file does not exist', async () => {
      expect(await runGenerator(readFile(path.join(TEST_DIR, 'missing.txt')))).toBeNull()
    })

    it('fails when the path is a directory', async () => {
      const result = await runGeneratorError(readFile(TEST_DIR))
      expect(result.message.length).toBeGreaterThan(0)
    })
  })

  describe('unlink', () => {
    beforeEach(async () => {
      await fsp.mkdir(TEST_DIR, { recursive: true })
    })

    it('removes an existing file', async () => {
      const filePath = path.join(TEST_DIR, 'gone.txt')
      await fsp.writeFile(filePath, 'bye')
      await expect(runGenerator(unlink(filePath))).resolves.toBeUndefined()
      expect(fs.existsSync(filePath)).toBe(false)
    })

    it('accepts a path that is already gone', async () => {
      await expect(
        runGenerator(unlink(path.join(TEST_DIR, 'missing.txt'))),
      ).resolves.toBeUndefined()
    })
  })

  describe('writeFile', () => {
    beforeEach(async () => {
      await fsp.mkdir(TEST_DIR, { recursive: true })
    })

    it('writes a new file', async () => {
      const filePath = path.join(TEST_DIR, 'ok.txt')
      await expect(runGenerator(writeFile(filePath, 'hello'))).resolves.toBeUndefined()
      expect(await fsp.readFile(filePath, 'utf8')).toBe('hello')
    })

    it('skips the write when the contents already match', async () => {
      const filePath = path.join(TEST_DIR, 'same.txt')
      await fsp.writeFile(filePath, 'same')
      const before = await fsp.stat(filePath)
      await new Promise((resolve) => {
        setTimeout(resolve, 50)
      })
      await expect(runGenerator(writeFile(filePath, 'same'))).resolves.toBeUndefined()
      const after = await fsp.stat(filePath)
      expect(after.mtimeMs).toBe(before.mtimeMs)
    })

    it('overwrites when the contents differ', async () => {
      const filePath = path.join(TEST_DIR, 'diff.txt')
      await fsp.writeFile(filePath, 'old')
      await expect(runGenerator(writeFile(filePath, 'new'))).resolves.toBeUndefined()
      expect(await fsp.readFile(filePath, 'utf8')).toBe('new')
    })
  })
})
