'use strict'

const Joi = require('joi')
const { metric } = require('../../lib/text-formatters')
const { downloadCount } = require('../../lib/color-formatters')
const { BaseJsonService } = require('..')
const { nonNegativeInteger } = require('../validators')

const keywords = ['sublime', 'sublimetext', 'packagecontrol']

const schema = Joi.object({
  installs: Joi.object({
    total: nonNegativeInteger,
    daily: Joi.object({
      data: Joi.array()
        .items(
          Joi.object({
            totals: Joi.array()
              .items(nonNegativeInteger)
              .required(),
          }).required()
        )
        .required(),
    }).required(),
  }).required(),
})

function DownloadsForInterval(interval) {
  const { base, messageSuffix, transform } = {
    day: {
      base: 'packagecontrol/dd',
      messageSuffix: '/day',
      transform: resp => {
        const platforms = resp.installs.daily.data
        let downloads = 0
        platforms.forEach(platform => {
          // use the downloads from yesterday
          downloads += platform.totals[1]
        })
        return downloads
      },
    },
    week: {
      base: 'packagecontrol/dw',
      messageSuffix: '/week',
      transform: resp => {
        const platforms = resp.installs.daily.data
        let downloads = 0
        platforms.forEach(platform => {
          // total for the first 7 days
          for (let i = 0; i < 7; i++) {
            downloads += platform.totals[i]
          }
        })
        return downloads
      },
    },
    month: {
      base: 'packagecontrol/dm',
      messageSuffix: '/month',
      transform: resp => {
        const platforms = resp.installs.daily.data
        let downloads = 0
        platforms.forEach(platform => {
          // total for the first 30 days
          for (let i = 0; i < 30; i++) {
            downloads += platform.totals[i]
          }
        })
        return downloads
      },
    },
    total: {
      base: 'packagecontrol/dt',
      messageSuffix: '',
      transform: resp => resp.installs.total,
    },
  }[interval]

  return class PackageControlDownloads extends BaseJsonService {
    static render({ downloads }) {
      return {
        message: `${metric(downloads)}${messageSuffix}`,
        color: downloadCount(downloads),
      }
    }

    async fetch({ packageName }) {
      const url = `https://packagecontrol.io/packages/${packageName}.json`
      return this._requestJson({ schema, url })
    }

    async handle({ packageName }) {
      const data = await this.fetch({ packageName })
      return this.constructor.render({ downloads: transform(data) })
    }

    static get defaultBadgeData() {
      return { label: 'downloads' }
    }

    static get category() {
      return 'downloads'
    }

    static get route() {
      return { base, pattern: ':packageName' }
    }

    static get examples() {
      return [
        {
          title: 'Package Control',
          namedParams: { packageName: 'GitGutter' },
          staticPreview: this.render({ downloads: 12000 }),
          keywords,
        },
      ]
    }
  }
}

module.exports = ['day', 'week', 'month', 'total'].map(DownloadsForInterval)
